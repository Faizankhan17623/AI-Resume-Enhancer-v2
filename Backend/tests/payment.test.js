const request = require('supertest')
const crypto = require('crypto')
const app = require('../index')
const User = require('../Models/User')
const Payment = require('../Models/Payment')

// createOrder calls out to the real Razorpay API sir — stub the instance so tests stay offline
jest.mock('../utils/Razorpay.js', () => ({
    orders: {
        create: jest.fn().mockResolvedValue({ id: 'order_test123', amount: 19900, currency: 'INR' }),
    },
}))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    await User.create({
        firstName: 'payer',
        lastName: 'test',
        email: 'payer@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: '3333333333',
        CountryCode: '+91',
        ...overrides,
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: 'payer@example.com', password: 'correct-password' })

    return {
        token: loginRes.body.token,
        cookie: loginRes.headers['set-cookie'],
        userId: loginRes.body.user.id,
    }
}

describe('GET /api/v1/payment/plans', () => {
    it('is public and returns the three plans', async () => {
        const res = await request(app).get('/api/v1/payment/plans')

        expect(res.status).toBe(200)
        expect(res.body.plans.map((p) => p.key)).toEqual(['Basic', 'Pro', 'ProMax'])
    })
})

describe('POST /api/v1/payment/create-order', () => {
    it('requires auth', async () => {
        const res = await request(app)
            .post('/api/v1/payment/create-order')
            .send({ plan: 'Pro' })

        expect(res.status).toBe(401)
    })

    it('rejects an invalid/free plan', async () => {
        const { token } = await createLoggedInUser()

        const res = await request(app)
            .post('/api/v1/payment/create-order')
            .set('Authorization', `Bearer ${token}`)
            .send({ plan: 'Basic' })

        expect(res.status).toBe(400)
    })

    it('creates a Razorpay order and a pending Payment record for a valid plan', async () => {
        const { token, userId } = await createLoggedInUser()

        const res = await request(app)
            .post('/api/v1/payment/create-order')
            .set('Authorization', `Bearer ${token}`)
            .send({ plan: 'Pro' })

        expect(res.status).toBe(200)
        expect(res.body.order.id).toBe('order_test123')

        const stored = await Payment.findOne({ orderId: 'order_test123' })
        expect(stored).not.toBeNull()
        expect(stored.status).toBe('created')
        expect(String(stored.user)).toBe(userId)
    })
})

describe('POST /api/v1/payment/verify', () => {
    const buildSignedVerifyRequest = async () => {
        const { token, cookie, userId } = await createLoggedInUser()

        // start an order first so a payment-session cookie exists sir
        const orderRes = await request(app)
            .post('/api/v1/payment/create-order')
            .set('Authorization', `Bearer ${token}`)
            .set('Cookie', cookie)
            .send({ plan: 'Pro' })

        const paymentSessionCookie = orderRes.headers['set-cookie']

        const razorpayOrderId = orderRes.body.order.id
        const razorpayPaymentId = 'pay_test456'
        const validSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex')

        return { token, paymentSessionCookie, razorpayOrderId, razorpayPaymentId, validSignature, userId }
    }

    it('rejects verification with no payment-session cookie', async () => {
        const { token } = await createLoggedInUser()

        const res = await request(app)
            .post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${token}`)
            .send({
                razorpay_order_id: 'order_x',
                razorpay_payment_id: 'pay_x',
                razorpay_signature: 'bad',
            })

        expect(res.status).toBe(400)
    })

    it('rejects a forged/incorrect signature and marks the payment failed', async () => {
        const { token, paymentSessionCookie, razorpayOrderId, razorpayPaymentId } =
            await buildSignedVerifyRequest()

        const res = await request(app)
            .post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${token}`)
            .set('Cookie', paymentSessionCookie)
            .send({
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: 'not-the-real-signature',
            })

        expect(res.status).toBe(400)

        const stored = await Payment.findOne({ orderId: razorpayOrderId })
        expect(stored.status).toBe('failed')
    })

    it('accepts a correctly signed payment and upgrades the user plan', async () => {
        const { token, paymentSessionCookie, razorpayOrderId, razorpayPaymentId, validSignature, userId } =
            await buildSignedVerifyRequest()

        const res = await request(app)
            .post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${token}`)
            .set('Cookie', paymentSessionCookie)
            .send({
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: validSignature,
            })

        expect(res.status).toBe(200)
        expect(res.body.plan).toBe('Pro')

        const user = await User.findById(userId)
        expect(user.Subscription).toBe(true)
        expect(user.SubType).toBe('Pro')

        const stored = await Payment.findOne({ orderId: razorpayOrderId })
        expect(stored.status).toBe('paid')
    })
})
