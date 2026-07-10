const request = require('supertest')
const PDFDocument = require('pdfkit')
const app = require('../index')
const User = require('../Models/User')
const Review = require('../Models/Review')

// several of these tests send real emails (streak milestones, share flow touches User) sir —
// stub the mailer so tests stay offline, same pattern as auth.test.js
jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: 'streaker',
        lastName: 'test',
        email: overrides.email || 'streaker@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: '4444444444',
        CountryCode: '+91',
        ...overrides,
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return {
        token: loginRes.body.token,
        userId: loginRes.body.user.id,
    }
}

// a tiny real PDF built in-memory sir — no fixture file needed, pdfkit is already a dependency
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

describe('POST /api/v1/grammar-check', () => {
    it('requires auth', async () => {
        const res = await request(app).post('/api/v1/grammar-check')
        expect(res.status).toBe(401)
    })

    it('rejects a request with no file', async () => {
        const { token } = await createLoggedInUser()
        const res = await request(app)
            .post('/api/v1/grammar-check')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(400)
    })

    it('returns issues and a score for an uploaded resume PDF, without spending a credit', async () => {
        const { token, userId } = await createLoggedInUser()
        const pdfBuffer = await buildTestPdfBuffer('I am responsable for teh managment of a recieveing team.')

        const res = await request(app)
            .post('/api/v1/grammar-check')
            .set('Authorization', `Bearer ${token}`)
            .attach('PDf', pdfBuffer, 'resume.pdf')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(typeof res.body.score).toBe('number')
        expect(Array.isArray(res.body.issues)).toBe(true)
        expect(res.body.issues.length).toBeGreaterThan(0)

        // free feature sir — no AI credit consumed
        const user = await User.findById(userId)
        expect(user.count).toBe(0)
    })
})

describe('GET /api/v1/streak', () => {
    it('requires auth', async () => {
        const res = await request(app).get('/api/v1/streak')
        expect(res.status).toBe(401)
    })

    it('starts at zero for a brand new user', async () => {
        const { token } = await createLoggedInUser()
        const res = await request(app)
            .get('/api/v1/streak')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.currentStreak).toBe(0)
        expect(res.body.longestStreak).toBe(0)
    })
})

describe('Review sharing', () => {
    const createReview = (userId, overrides = {}) =>
        Review.create({
            user: userId,
            plan: 'Basic',
            jdTitle: 'Senior Backend Engineer',
            atsScore: 82,
            verdict: 'Strong Match',
            scoreBreakdown: { keywordMatch: 80, experienceRelevance: 85, skillsCoverage: 78, formatting: 90 },
            review: {
                summary: 'Great fit for this role.',
                strengths: ['Strong Node.js background'],
                missingKeywords: ['Kubernetes'],
                atsScore: 82,
            },
            ...overrides,
        })

    it('toggleShare requires auth', async () => {
        const res = await request(app).post('/api/v1/reviews/000000000000000000000000/share')
        expect(res.status).toBe(401)
    })

    it('generates a shareId on first share and the public route returns only the safe subset', async () => {
        const { token, userId } = await createLoggedInUser()
        const review = await createReview(userId)

        const shareRes = await request(app)
            .post(`/api/v1/reviews/${review._id}/share`)
            .set('Authorization', `Bearer ${token}`)

        expect(shareRes.status).toBe(200)
        expect(shareRes.body.isPublic).toBe(true)
        expect(shareRes.body.shareId).toBeTruthy()

        const publicRes = await request(app).get(`/api/v1/public/reviews/${shareRes.body.shareId}`)

        expect(publicRes.status).toBe(200)
        expect(publicRes.body.report.atsScore).toBe(82)
        expect(publicRes.body.report.verdict).toBe('Strong Match')
        expect(publicRes.body.report.strengths).toEqual(['Strong Node.js background'])
        // must NOT leak JD or missing keywords sir
        expect(publicRes.body.report.jdTitle).toBeUndefined()
        expect(publicRes.body.report.missingKeywords).toBeUndefined()
    })

    it('turning share off makes the public link 404', async () => {
        const { token, userId } = await createLoggedInUser()
        const review = await createReview(userId)

        const onRes = await request(app)
            .post(`/api/v1/reviews/${review._id}/share`)
            .set('Authorization', `Bearer ${token}`)
        const shareId = onRes.body.shareId

        const offRes = await request(app)
            .post(`/api/v1/reviews/${review._id}/share`)
            .set('Authorization', `Bearer ${token}`)
        expect(offRes.body.isPublic).toBe(false)

        const publicRes = await request(app).get(`/api/v1/public/reviews/${shareId}`)
        expect(publicRes.status).toBe(404)
    })

    it('404s for an unknown review id', async () => {
        const { token } = await createLoggedInUser()
        const res = await request(app)
            .post('/api/v1/reviews/000000000000000000000000/share')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(404)
    })
})

describe('GET /api/v1/leaderboard', () => {
    it('requires auth', async () => {
        const res = await request(app).get('/api/v1/leaderboard')
        expect(res.status).toBe(401)
    })

    it('ranks users by their best score, anonymized, highest first', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'first@example.com' })
        const { userId: secondUserId } = await createLoggedInUser({ email: 'second@example.com' })

        await Review.create([
            { user: userId, plan: 'Basic', atsScore: 60, verdict: 'Average Match', review: {} },
            { user: userId, plan: 'Basic', atsScore: 91, verdict: 'Strong Match', review: {} }, // best for user 1
            { user: secondUserId, plan: 'Basic', atsScore: 75, verdict: 'Good Match', review: {} },
        ])

        const res = await request(app)
            .get('/api/v1/leaderboard')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        const scores = res.body.leaderboard.map((r) => r.bestScore)
        expect(scores).toEqual([91, 75])

        // no identifying fields sir, only rank/label/score/isYou
        for (const row of res.body.leaderboard) {
            expect(Object.keys(row).sort()).toEqual(['bestScore', 'isYou', 'label', 'rank'])
        }
        expect(res.body.leaderboard[0].isYou).toBe(true)
        expect(res.body.leaderboard[1].isYou).toBe(false)
    })
})
