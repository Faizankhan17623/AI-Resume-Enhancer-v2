const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const MockInterview = require('../Models/MockInterview')

// PDF parsing has an unrelated environment issue in this test runner (pre-existing, seen the
// same way in ai.test.js/resume.test.js/newFeatures.test.js/coverLetter.test.js) — mock it out
// the same way chatStream.test.js/ai.test.js mock groq-sdk, so these tests exercise the actual
// mock-interview logic (plan gate, credit spend, Groq JSON scoring, turn persistence) instead
// of tripping over that unrelated failure.
jest.mock('pdf-parse', () => ({
    PDFParse: jest.fn().mockImplementation(() => ({
        getText: jest.fn().mockResolvedValue({ text: 'Experienced backend engineer with 5 years in Node.js, Express and MongoDB.' }),
    })),
}))

const mockCreate = jest.fn()
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: (...args) => mockCreate(...args) } },
    }))
})

const mockCompletion = (obj) => ({
    choices: [{ message: { content: JSON.stringify(obj) } }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
})

const firstQuestionJson = { question: 'Tell me about your experience with Node.js.', category: 'Technical', difficulty: 'medium' }
const scoredAnswerJson = {
    score: 7,
    feedback: 'Solid answer but light on metrics.',
    sampleAnswer: 'A stronger version citing specific throughput numbers...',
    nextQuestion: { question: 'How would you scale this service?', category: 'System Design', difficulty: 'hard' },
}

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: 'candidate',
        lastName: 'test',
        email: overrides.email || 'candidate@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number || '4444444440',
        CountryCode: '+91',
        ...overrides,
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token, userId: loginRes.body.user.id }
}

const makeProMax = (userId) =>
    User.findByIdAndUpdate(userId, {
        Subscription: true,
        SubType: 'ProMax',
        SubscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

const startSession = (token) =>
    request(app)
        .post('/api/v1/mock-interview')
        .set('Authorization', `Bearer ${token}`)
        .field('jd', 'Looking for a backend engineer skilled in Node.js and system design')
        .attach('PDf', Buffer.from('%PDF-1.4 fake'), 'resume.pdf')

describe('POST /api/v1/mock-interview', () => {
    afterEach(() => {
        mockCreate.mockReset()
    })

    it('requires auth', async () => {
        const res = await request(app).post('/api/v1/mock-interview')
        expect(res.status).toBe(401)
    })

    it('rejects a Basic-plan user with a 403 upgrade message', async () => {
        const { token } = await createLoggedInUser({ email: 'basic@example.com', number: '4444444441' })
        const res = await startSession(token)

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(mockCreate).not.toHaveBeenCalled()
    })

    it('rejects a Pro-plan user the same way — this feature is ProMax only', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'pro@example.com', number: '4444444442' })
        await User.findByIdAndUpdate(userId, {
            Subscription: true,
            SubType: 'Pro',
            SubscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })

        const res = await startSession(token)
        expect(res.status).toBe(403)
    })

    it('starts a session for a ProMax user, spending one credit and saving the first question', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'promax@example.com', number: '4444444443' })
        await makeProMax(userId)
        mockCreate.mockResolvedValue(mockCompletion(firstQuestionJson))

        const res = await startSession(token)

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.sessionId).toBeDefined()
        expect(res.body.turn.question).toBe(firstQuestionJson.question)

        const saved = await MockInterview.findById(res.body.sessionId)
        expect(saved).not.toBeNull()
        expect(saved.status).toBe('in-progress')
        expect(saved.turns).toHaveLength(1)
        expect(saved.turns[0].answer).toBeUndefined()

        const updatedUser = await User.findById(userId)
        expect(updatedUser.count).toBe(1)
    })

    it('returns a 502 when the AI response is not valid JSON', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'badjson@example.com', number: '4444444444' })
        await makeProMax(userId)
        mockCreate.mockResolvedValue(mockCompletion(firstQuestionJson))
        // override with malformed content after the shared mock above
        mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: 'not json at all' } }], usage: {} })

        const res = await startSession(token)
        expect(res.status).toBe(502)
    })
})

describe('POST /api/v1/mock-interview/:sessionId/answer', () => {
    afterEach(() => {
        mockCreate.mockReset()
    })

    const startAndGetSession = async (email, number) => {
        const { token, userId } = await createLoggedInUser({ email, number })
        await makeProMax(userId)
        mockCreate.mockResolvedValue(mockCompletion(firstQuestionJson))
        const startRes = await startSession(token)
        return { token, userId, sessionId: startRes.body.sessionId }
    }

    it('scores the current answer and appends the next question', async () => {
        const { token, sessionId } = await startAndGetSession('answerer@example.com', '4444444445')
        mockCreate.mockResolvedValue(mockCompletion(scoredAnswerJson))

        const res = await request(app)
            .post(`/api/v1/mock-interview/${sessionId}/answer`)
            .set('Authorization', `Bearer ${token}`)
            .send({ answer: 'I used Node.js to build a payments service handling 500 req/s.' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.scoredTurn.score).toBe(7)
        expect(res.body.status).toBe('in-progress')
        expect(res.body.nextTurn.question).toBe(scoredAnswerJson.nextQuestion.question)

        const saved = await MockInterview.findById(sessionId)
        expect(saved.turns).toHaveLength(2)
        expect(saved.turns[0].score).toBe(7)
        expect(saved.turns[0].answer).toBe('I used Node.js to build a payments service handling 500 req/s.')
        expect(saved.turns[1].answer).toBeUndefined()
    })

    it('rejects answering a session that does not belong to the caller', async () => {
        const { sessionId } = await startAndGetSession('owner@example.com', '4444444446')

        const { token: intruderToken, userId: intruderId } = await createLoggedInUser({ email: 'intruder2@example.com', number: '4444444447' })
        await makeProMax(intruderId)

        const res = await request(app)
            .post(`/api/v1/mock-interview/${sessionId}/answer`)
            .set('Authorization', `Bearer ${intruderToken}`)
            .send({ answer: 'peeking into someone else\'s session' })

        expect(res.status).toBe(404)
    })

    it('rejects an empty answer with a 400', async () => {
        const { token, sessionId } = await startAndGetSession('emptyanswer@example.com', '4444444448')
        mockCreate.mockClear() // sir — startAndGetSession's own call shouldn't count against this assertion

        const res = await request(app)
            .post(`/api/v1/mock-interview/${sessionId}/answer`)
            .set('Authorization', `Bearer ${token}`)
            .send({ answer: '   ' })

        expect(res.status).toBe(400)
        expect(mockCreate).not.toHaveBeenCalled()
    })
})
