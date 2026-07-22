const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const Review = require('../Models/Review')
const Payment = require('../Models/Payment')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: overrides.firstName || 'editme',
        lastName: 'test',
        email: overrides.email,
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number,
        CountryCode: '+91',
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token, userId: loginRes.body.user.id }
}

describe('PATCH /api/v1/profile/first-name', () => {
    it('updates the first name', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'firstname@example.com', number: '7777777770' })

        const res = await request(app)
            .patch('/api/v1/profile/first-name')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: 'newname' })

        expect(res.status).toBe(200)
        const updated = await User.findById(userId)
        expect(updated.firstName).toBe('newname')
    })

    it('rejects a first name that is already taken', async () => {
        await createLoggedInUser({ firstName: 'taken', email: 'taken@example.com', number: '7777777771' })
        const { token } = await createLoggedInUser({ email: 'wantstaken@example.com', number: '7777777772' })

        const res = await request(app)
            .patch('/api/v1/profile/first-name')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: 'taken' })

        expect(res.status).toBe(409)
    })
})

describe('PATCH /api/v1/profile/email', () => {
    it('updates the email and rejects a duplicate', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'oldemail@example.com', number: '7777777773' })

        const res = await request(app)
            .patch('/api/v1/profile/email')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'newemail@example.com' })

        expect(res.status).toBe(200)
        const updated = await User.findById(userId)
        expect(updated.email).toBe('newemail@example.com')
    })
})

describe('PATCH /api/v1/profile/number', () => {
    it('rejects a phone number that is not 10 digits', async () => {
        const { token } = await createLoggedInUser({ email: 'badnumber@example.com', number: '7777777774' })

        const res = await request(app)
            .patch('/api/v1/profile/number')
            .set('Authorization', `Bearer ${token}`)
            .send({ number: '123' })

        expect(res.status).toBe(400)
    })
})

describe('GET /api/v1/profile/export', () => {
    it('requires auth', async () => {
        const res = await request(app).get('/api/v1/profile/export')
        expect(res.status).toBe(401)
    })

    it('bundles the caller\'s own data and excludes sensitive fields', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'exporter@example.com', number: '7777777775' })

        await Review.create({
            user: userId, atsScore: 80, verdict: 'Good Match',
            review: { summary: 'ok' },
        })
        await Payment.create({
            user: userId, plan: 'Pro', amount: 19900, orderId: 'order_export_test',
            status: 'paid', signature: 'super-secret-signature',
        })

        const res = await request(app)
            .get('/api/v1/profile/export')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.user.password).toBeUndefined()
        expect(res.body.user.email).toBe('exporter@example.com')
        expect(res.body.reviews).toHaveLength(1)
        expect(res.body.payments).toHaveLength(1)
        expect(res.body.payments[0].signature).toBeUndefined()
    })

    it('never includes another user\'s data', async () => {
        const { token } = await createLoggedInUser({ email: 'exportself@example.com', number: '7777777776' })
        const { userId: otherUserId } = await createLoggedInUser({ email: 'exportother@example.com', number: '7777777777' })
        await Review.create({ user: otherUserId, atsScore: 50, verdict: 'Weak Match', review: {} })

        const res = await request(app)
            .get('/api/v1/profile/export')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.reviews).toHaveLength(0)
    })
})
