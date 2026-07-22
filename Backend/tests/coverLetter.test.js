const request = require('supertest')
const PDFDocument = require('pdfkit')
const app = require('../index')
const User = require('../Models/User')
const CoverLetter = require('../Models/CoverLetter')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const mockCreate = jest.fn()
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: (...args) => mockCreate(...args) } },
    }))
})

const mockCompletion = (content) => ({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 80, completion_tokens: 120, total_tokens: 200 },
})

const buildTestPdfBuffer = (text) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument()
        const chunks = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
        doc.text(text)
        doc.end()
    })

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: overrides.firstName || 'letterwriter',
        lastName: 'test',
        email: overrides.email || 'letterwriter@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number || '1111111110',
        CountryCode: '+91',
        SubType: overrides.SubType,
        Subscription: overrides.Subscription,
        SubscriptionExpires: overrides.SubscriptionExpires,
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token, userId: loginRes.body.user.id }
}

const proUser = (overrides = {}) => createLoggedInUser({
    SubType: 'Pro',
    Subscription: true,
    SubscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
})

describe('POST /api/v1/cover-letter', () => {
    afterEach(() => {
        mockCreate.mockReset()
    })

    it('requires auth', async () => {
        const res = await request(app).post('/api/v1/cover-letter')
        expect(res.status).toBe(401)
    })

    it('rejects a Basic-plan user with 403 (Pro+ feature)', async () => {
        const { token } = await createLoggedInUser({ firstName: 'basicwriter', email: 'basic@example.com', number: '1111111111' })
        const pdfBuffer = await buildTestPdfBuffer('Some resume text.')

        const res = await request(app)
            .post('/api/v1/cover-letter')
            .set('Authorization', `Bearer ${token}`)
            .field('jd', 'A job description')
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(403)
        expect(mockCreate).not.toHaveBeenCalled()
    })

    it('rejects a Pro user with no JD', async () => {
        const { token } = await proUser({ firstName: 'nojdwriter', email: 'nojd@example.com', number: '1111111112' })
        const pdfBuffer = await buildTestPdfBuffer('Some resume text.')

        const res = await request(app)
            .post('/api/v1/cover-letter')
            .set('Authorization', `Bearer ${token}`)
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(400)
    })

    it('generates and saves a cover letter for a Pro user', async () => {
        const { token, userId } = await proUser({ firstName: 'prowriter', email: 'pro@example.com', number: '1111111113' })
        mockCreate.mockResolvedValue(mockCompletion('Dear Hiring Manager,\n\nI am excited to apply for this role given my 5 years of backend experience with Node.js and Docker.\n\nSincerely,\n[Your Name]'))

        const pdfBuffer = await buildTestPdfBuffer('Backend engineer with 5 years of Node.js and Docker experience.')

        const res = await request(app)
            .post('/api/v1/cover-letter')
            .set('Authorization', `Bearer ${token}`)
            .field('jd', 'Looking for a backend engineer skilled in Node.js and Docker')
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(typeof res.body.content).toBe('string')
        expect(res.body.coverLetterId).toBeTruthy()
        expect(res.body.genericCheck).toHaveProperty('score')

        const stored = await CoverLetter.findOne({ user: userId })
        expect(stored).not.toBeNull()
    })
})

describe('GET /api/v1/cover-letter', () => {
    it('only returns the caller\'s own letters', async () => {
        const { token, userId } = await proUser({ firstName: 'listeruser', email: 'lister@example.com', number: '1111111114' })
        const { userId: otherUserId } = await proUser({ firstName: 'otheruser', email: 'other@example.com', number: '1111111115' })

        await CoverLetter.create({ user: userId, jdTitle: 'Mine', content: 'my letter' })
        await CoverLetter.create({ user: otherUserId, jdTitle: 'Not mine', content: 'someone else\'s letter' })

        const res = await request(app)
            .get('/api/v1/cover-letter')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.letters).toHaveLength(1)
        expect(res.body.letters[0].jdTitle).toBe('Mine')
    })
})

describe('GET /api/v1/cover-letter/:coverLetterId', () => {
    it('returns 404 for a letter owned by someone else', async () => {
        const { token } = await proUser({ firstName: 'requester', email: 'requester@example.com', number: '1111111116' })
        const { userId: otherUserId } = await proUser({ firstName: 'owneruser', email: 'owner@example.com', number: '1111111117' })

        const letter = await CoverLetter.create({ user: otherUserId, jdTitle: 'Private', content: 'not yours' })

        const res = await request(app)
            .get(`/api/v1/cover-letter/${letter._id}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(404)
    })
})
