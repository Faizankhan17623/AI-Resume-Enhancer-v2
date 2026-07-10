const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const OTP = require('../Models/OTP')

// the OTP model emails on save (pre-save hook) sir — stub it out so tests don't hit real SMTP
jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

describe('POST /api/v1/Send-otp', () => {
    it('rejects an email that is already registered', async () => {
        await User.create({
            firstName: 'existing',
            lastName: 'user',
            email: 'taken@example.com',
            password: 'hashed',
            confirmpassword: 'hashed',
            number: '9999999999',
            CountryCode: '+91',
        })

        const res = await request(app)
            .post('/api/v1/Send-otp')
            .send({ email: 'taken@example.com' })

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('creates an OTP record for a new email', async () => {
        const res = await request(app)
            .post('/api/v1/Send-otp')
            .send({ email: 'new@example.com' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)

        const stored = await OTP.findOne({ email: 'new@example.com' })
        expect(stored).not.toBeNull()
        expect(stored.otp).toMatch(/^\d{6}$/)
    })
})

describe('POST /api/v1/Createuser', () => {
    const baseBody = {
        firstName: 'jane',
        lastName: 'doe',
        email: 'jane@example.com',
        password: 'Secret123!',
        number: '8888888888',
        Code: '+91',
    }

    it('rejects signup with a missing/invalid OTP', async () => {
        const res = await request(app)
            .post('/api/v1/Createuser')
            .send({ ...baseBody, otp: '000000' })

        expect(res.status).toBe(400)
        expect(res.body.field).toBe('otp')
    })

    it('registers a user when the OTP matches the latest one sent', async () => {
        await OTP.create({ email: baseBody.email, otp: '123456' })

        const res = await request(app)
            .post('/api/v1/Createuser')
            .send({ ...baseBody, otp: '123456' })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)

        const stored = await User.findOne({ email: baseBody.email })
        expect(stored).not.toBeNull()
        // the raw password must never be stored sir
        expect(stored.password).not.toBe(baseBody.password)
    })

    it('rejects a duplicate email even with a valid OTP', async () => {
        await User.create({
            firstName: 'other',
            lastName: 'person',
            email: baseBody.email,
            password: 'hashed',
            confirmpassword: 'hashed',
            number: '7777777777',
            CountryCode: '+91',
        })
        await OTP.create({ email: baseBody.email, otp: '123456' })

        const res = await request(app)
            .post('/api/v1/Createuser')
            .send({ ...baseBody, otp: '123456' })

        expect(res.status).toBe(409)
        expect(res.body.field).toBe('email')
    })
})

describe('POST /api/v1/Login', () => {
    const bcrypt = require('bcrypt')

    it('rejects a login for an email that does not exist', async () => {
        const res = await request(app)
            .post('/api/v1/Login')
            .send({ email: 'nobody@example.com', password: 'whatever' })

        expect(res.status).toBe(404)
        expect(res.body.field).toBe('email')
    })

    it('rejects a wrong password', async () => {
        const hashed = await bcrypt.hash('correct-password', 10)
        await User.create({
            firstName: 'login',
            lastName: 'test',
            email: 'login@example.com',
            password: hashed,
            confirmpassword: hashed,
            number: '6666666666',
            CountryCode: '+91',
        })

        const res = await request(app)
            .post('/api/v1/Login')
            .send({ email: 'login@example.com', password: 'wrong-password' })

        expect(res.status).toBe(401)
        expect(res.body.field).toBe('password')
    })

    it('logs in with the correct credentials and returns a token', async () => {
        const hashed = await bcrypt.hash('correct-password', 10)
        await User.create({
            firstName: 'login2',
            lastName: 'test',
            email: 'login2@example.com',
            password: hashed,
            confirmpassword: hashed,
            number: '5555555555',
            CountryCode: '+91',
        })

        const res = await request(app)
            .post('/api/v1/Login')
            .send({ email: 'login2@example.com', password: 'correct-password' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(typeof res.body.token).toBe('string')
        expect(res.body.user.email).toBe('login2@example.com')
    })
})

describe('GET /api/v1/profile', () => {
    it('rejects a request with no token', async () => {
        const res = await request(app).get('/api/v1/profile')

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('rejects a request with a garbage token', async () => {
        const res = await request(app)
            .get('/api/v1/profile')
            .set('Authorization', 'Bearer not-a-real-token')

        expect(res.status).toBe(401)
    })

    it('returns the profile for a logged-in user', async () => {
        const bcrypt = require('bcrypt')
        const hashed = await bcrypt.hash('correct-password', 10)
        await User.create({
            firstName: 'profile',
            lastName: 'test',
            email: 'profile@example.com',
            password: hashed,
            confirmpassword: hashed,
            number: '4444444444',
            CountryCode: '+91',
        })

        const loginRes = await request(app)
            .post('/api/v1/Login')
            .send({ email: 'profile@example.com', password: 'correct-password' })

        const res = await request(app)
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${loginRes.body.token}`)

        expect(res.status).toBe(200)
        expect(res.body.user.email).toBe('profile@example.com')
        expect(res.body.plan.key).toBe('Basic')
    })
})
