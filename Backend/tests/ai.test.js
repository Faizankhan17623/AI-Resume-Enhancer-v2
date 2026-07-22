const request = require('supertest')
const PDFDocument = require('pdfkit')
const app = require('../index')
const User = require('../Models/User')
const Review = require('../Models/Review')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

// AI.js calls grok.chat.completions.create sir — same mocking approach as chatStream.test.js,
// a plain JSON-mode response this time (no streaming) since runReview awaits one full completion
const mockCreate = jest.fn()
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: (...args) => mockCreate(...args) } },
    }))
})

const validReviewJson = JSON.stringify({
    atsScore: 78,
    verdict: 'Good Match',
    summary: 'Solid overall fit for the role.',
    scoreBreakdown: { keywordMatch: 70, experienceRelevance: 80, skillsCoverage: 75, formatting: 90 },
    strengths: ['Clear structure', 'Relevant experience', 'Good formatting'],
    missingKeywords: ['Docker', 'Kubernetes'],
    improvements: [
        { priority: 'high', issue: 'Missing metrics', before: 'Improved performance', after: 'Improved performance by 30%' },
    ],
})

const mockCompletion = (content) => ({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
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
        firstName: 'reviewer',
        lastName: 'test',
        email: overrides.email || 'reviewer@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number || '3333333330',
        CountryCode: '+91',
        ...overrides,
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token, userId: loginRes.body.user.id }
}

describe('POST /api/v1/response', () => {
    afterEach(() => {
        mockCreate.mockReset()
    })

    it('requires auth', async () => {
        const res = await request(app).post('/api/v1/response')
        expect(res.status).toBe(401)
    })

    it('rejects a request with no PDF attached', async () => {
        const { token } = await createLoggedInUser()
        const res = await request(app)
            .post('/api/v1/response')
            .set('Authorization', `Bearer ${token}`)
            .field('jd', 'Looking for a backend engineer')

        expect(res.status).toBe(400)
    })

    it('rejects a request with a PDF but no job description', async () => {
        const { token } = await createLoggedInUser({ email: 'noJd@example.com', number: '3333333331' })
        const pdfBuffer = await buildTestPdfBuffer('Experienced backend engineer with 5 years in Node.js.')

        const res = await request(app)
            .post('/api/v1/response')
            .set('Authorization', `Bearer ${token}`)
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('scores a resume against a JD and persists a Review, spending one credit', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'scored@example.com', number: '3333333332' })
        mockCreate.mockResolvedValue(mockCompletion(validReviewJson))

        const pdfBuffer = await buildTestPdfBuffer('Experienced backend engineer with 5 years in Node.js, Express and MongoDB.')

        const res = await request(app)
            .post('/api/v1/response')
            .set('Authorization', `Bearer ${token}`)
            .field('jd', 'Looking for a backend engineer skilled in Node.js and Docker')
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.review.atsScore).toBe(78)

        const stored = await Review.findOne({ user: userId })
        expect(stored).not.toBeNull()
        expect(stored.atsScore).toBe(78)

        const updatedUser = await User.findById(userId)
        expect(updatedUser.count).toBe(1)
    })

    it('refuses once the Basic plan credit limit is used up', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'nocredits@example.com', number: '3333333333' })
        await User.findByIdAndUpdate(userId, { count: 5 }) // Basic plan cap, see utils/Plans.js

        const pdfBuffer = await buildTestPdfBuffer('Some resume text.')
        const res = await request(app)
            .post('/api/v1/response')
            .set('Authorization', `Bearer ${token}`)
            .field('jd', 'Any job description')
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(403)
        expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns a 502 when the AI response is empty', async () => {
        const { token } = await createLoggedInUser({ email: 'empty@example.com', number: '3333333334' })
        mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }], usage: {} })

        const pdfBuffer = await buildTestPdfBuffer('Some resume text.')
        const res = await request(app)
            .post('/api/v1/response')
            .set('Authorization', `Bearer ${token}`)
            .field('jd', 'Any job description')
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(502)
    })
})
