const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const Chat = require('../Models/Chat')

// sendMessage streams tokens from Groq sir — fake an async-iterable of chunks
// shaped like the real groq-sdk ChatCompletionChunk stream
const mockCreate = jest.fn()
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: (...args) => mockCreate(...args) } },
    }))
})

const chunksOf = (deltas) => ({
    [Symbol.asyncIterator]: async function* () {
        for (const delta of deltas) {
            yield { choices: [{ delta: { content: delta } }] }
        }
        yield { choices: [{ delta: {} }], usage: { total_tokens: 42 } }
    },
})

// reads the newline-delimited JSON stream body supertest buffers up sir
const parseLines = (text) =>
    text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))

const createLoggedInUserWithChat = async () => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: 'chatter',
        lastName: 'test',
        email: 'chatter@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: '2222222222',
        CountryCode: '+91',
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: 'chatter@example.com', password: 'correct-password' })

    const chat = await Chat.create({
        user: user._id,
        title: 'Test Chat',
        resumeText: 'Experienced software engineer...',
        jd: 'Looking for a software engineer...',
        messages: [],
    })

    return { token: loginRes.body.token, chatId: chat._id.toString() }
}

describe('POST /api/v1/chat/:chatId/message (streaming)', () => {
    afterEach(() => {
        mockCreate.mockReset()
    })

    it('streams the reply token by token and persists both sides of the turn', async () => {
        mockCreate.mockResolvedValue(chunksOf(['Hello', ' there', ', good', ' fit!']))

        const { token, chatId } = await createLoggedInUserWithChat()

        const res = await request(app)
            .post(`/api/v1/chat/${chatId}/message`)
            .set('Authorization', `Bearer ${token}`)
            .send({ message: 'How do I match this JD better?' })

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toMatch(/text\/plain/)

        const events = parseLines(res.text)
        const chunkEvents = events.filter((e) => e.type === 'chunk')
        const doneEvent = events.find((e) => e.type === 'done')

        expect(chunkEvents.map((e) => e.content).join('')).toBe('Hello there, good fit!')
        expect(doneEvent).toBeDefined()

        const chat = await Chat.findById(chatId)
        expect(chat.messages).toHaveLength(2)
        expect(chat.messages[0]).toMatchObject({ role: 'user', content: 'How do I match this JD better?' })
        expect(chat.messages[1]).toMatchObject({ role: 'assistant', content: 'Hello there, good fit!' })
    })

    it('strips a <think>...</think> reasoning block before it ever reaches the client', async () => {
        mockCreate.mockResolvedValue(
            chunksOf(['<think>', 'reasoning that must never leak', '</think>', 'The actual', ' answer.'])
        )

        const { token, chatId } = await createLoggedInUserWithChat()

        const res = await request(app)
            .post(`/api/v1/chat/${chatId}/message`)
            .set('Authorization', `Bearer ${token}`)
            .send({ message: 'Give me feedback' })

        expect(res.status).toBe(200)
        const events = parseLines(res.text)
        const streamed = events.filter((e) => e.type === 'chunk').map((e) => e.content).join('')

        expect(streamed).toBe('The actual answer.')
        expect(streamed).not.toMatch(/reasoning that must never leak/)

        const chat = await Chat.findById(chatId)
        expect(chat.messages[1].content).toBe('The actual answer.')
    })

    it('does not persist anything if the stream fails and reports an error event', async () => {
        mockCreate.mockRejectedValue(new Error('groq is down'))

        const { token, chatId } = await createLoggedInUserWithChat()

        const res = await request(app)
            .post(`/api/v1/chat/${chatId}/message`)
            .set('Authorization', `Bearer ${token}`)
            .send({ message: 'Anything' })

        expect(res.status).toBe(200) // headers were already flushed before the failure sir
        const events = parseLines(res.text)
        expect(events.some((e) => e.type === 'error')).toBe(true)

        const chat = await Chat.findById(chatId)
        expect(chat.messages).toHaveLength(0)
    })

    it('rejects a message for a chat that does not belong to the caller', async () => {
        mockCreate.mockResolvedValue(chunksOf(['should never be called']))
        const { chatId } = await createLoggedInUserWithChat()

        const bcrypt = require('bcrypt')
        const hashed = await bcrypt.hash('another-password', 10)
        await User.create({
            firstName: 'intruder',
            lastName: 'test',
            email: 'intruder@example.com',
            password: hashed,
            confirmpassword: hashed,
            number: '1112223334',
            CountryCode: '+91',
        })
        const otherLogin = await request(app)
            .post('/api/v1/Login')
            .send({ email: 'intruder@example.com', password: 'another-password' })

        const res = await request(app)
            .post(`/api/v1/chat/${chatId}/message`)
            .set('Authorization', `Bearer ${otherLogin.body.token}`)
            .send({ message: 'peeking into someone else\'s chat' })

        expect(res.status).toBe(404)
        expect(mockCreate).not.toHaveBeenCalled()
    })
})
