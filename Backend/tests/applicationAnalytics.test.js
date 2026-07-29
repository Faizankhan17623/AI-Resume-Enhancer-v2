const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const Review = require('../Models/Review')
const Application = require('../Models/Application')

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: 'tracker',
        lastName: 'test',
        email: overrides.email || 'tracker@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number || '5555555550',
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

const createReview = (userId, atsScore) =>
    Review.create({
        user: userId,
        plan: 'ProMax',
        jdTitle: 'Backend engineer role',
        atsScore,
        verdict: atsScore >= 80 ? 'Excellent Match' : atsScore >= 60 ? 'Good Match' : 'Needs Work',
        scoreBreakdown: { keywordMatch: atsScore, experienceRelevance: atsScore, skillsCoverage: atsScore, formatting: atsScore },
        review: { atsScore },
    })

describe('GET /api/v1/applications/analytics', () => {
    it('requires auth', async () => {
        const res = await request(app).get('/api/v1/applications/analytics')
        expect(res.status).toBe(401)
    })

    it('rejects a Basic-plan user with a 403 upgrade message', async () => {
        const { token } = await createLoggedInUser({ email: 'basicuser@example.com', number: '5555555551' })
        const res = await request(app)
            .get('/api/v1/applications/analytics')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
    })

    it('rejects a Pro-plan user the same way — this view is Pro Max only', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'prouser@example.com', number: '5555555552' })
        await User.findByIdAndUpdate(userId, {
            Subscription: true,
            SubType: 'Pro',
            SubscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })

        const res = await request(app)
            .get('/api/v1/applications/analytics')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(403)
    })

    it('returns an empty-but-successful result when no applications are linked to a review', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'nolinks@example.com', number: '5555555553' })
        await makeProMax(userId)
        await Application.create({ user: userId, company: 'Acme', role: 'Engineer', status: 'Applied' })

        const res = await request(app)
            .get('/api/v1/applications/analytics')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.results).toEqual([])
        expect(res.body.linkedCount).toBe(0)
        expect(res.body.totalCount).toBe(1)
    })

    it('buckets linked applications by review score range and computes the interview/offer rate per bucket', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'bucketed@example.com', number: '5555555554' })
        await makeProMax(userId)

        // 80+ bucket: 2 applications, 1 got an interview -> 50%
        const highReview1 = await createReview(userId, 85)
        const highReview2 = await createReview(userId, 90)
        await Application.create({ user: userId, company: 'A', role: 'Eng', status: 'Interview', review: highReview1._id })
        await Application.create({ user: userId, company: 'B', role: 'Eng', status: 'Rejected', review: highReview2._id })

        // Below 60 bucket: 1 application, rejected -> 0%
        const lowReview = await createReview(userId, 40)
        await Application.create({ user: userId, company: 'C', role: 'Eng', status: 'Rejected', review: lowReview._id })

        // unlinked application sir — must be excluded entirely, not counted in any bucket
        await Application.create({ user: userId, company: 'D', role: 'Eng', status: 'Offer' })

        const res = await request(app)
            .get('/api/v1/applications/analytics')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.linkedCount).toBe(3)
        expect(res.body.totalCount).toBe(4)

        const highBucket = res.body.results.find((b) => b.scoreRange === '80+')
        const lowBucket = res.body.results.find((b) => b.scoreRange === 'Below 60')

        expect(highBucket.total).toBe(2)
        expect(highBucket.interviewRate).toBe(50)
        expect(lowBucket.total).toBe(1)
        expect(lowBucket.interviewRate).toBe(0)
    })

    it('only counts the caller\'s own applications, never another user\'s', async () => {
        const { userId: otherUserId } = await createLoggedInUser({ email: 'otheruser@example.com', number: '5555555555' })
        const otherReview = await createReview(otherUserId, 95)
        await Application.create({ user: otherUserId, company: 'X', role: 'Eng', status: 'Offer', review: otherReview._id })

        const { token, userId } = await createLoggedInUser({ email: 'me@example.com', number: '5555555556' })
        await makeProMax(userId)

        const res = await request(app)
            .get('/api/v1/applications/analytics')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.linkedCount).toBe(0)
        expect(res.body.totalCount).toBe(0)
    })
})

describe('POST /api/v1/applications with a review link', () => {
    it('rejects a review id that does not belong to the caller', async () => {
        const { userId: otherUserId } = await createLoggedInUser({ email: 'reviewowner@example.com', number: '5555555557' })
        const otherReview = await createReview(otherUserId, 70)

        const { token } = await createLoggedInUser({ email: 'applicant@example.com', number: '5555555558' })

        const res = await request(app)
            .post('/api/v1/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({ company: 'Acme', role: 'Engineer', review: otherReview._id.toString() })

        expect(res.status).toBe(400)
    })

    it('accepts and stores a review id the caller owns', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'ownreview@example.com', number: '5555555559' })
        const review = await createReview(userId, 88)

        const res = await request(app)
            .post('/api/v1/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({ company: 'Acme', role: 'Engineer', review: review._id.toString() })

        expect(res.status).toBe(201)
        expect(res.body.application.review).toBe(review._id.toString())
    })
})
