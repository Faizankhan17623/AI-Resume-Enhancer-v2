const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: overrides.firstName || 'roletest',
        lastName: 'test',
        email: overrides.email,
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number,
        CountryCode: '+91',
        role: overrides.role || 'User',
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token, userId: loginRes.body.user.id }
}

describe('isUser gate — product features are blocked for Admin/Support', () => {
    it('a plain User can reach a User-only route (resume library)', async () => {
        const { token } = await createLoggedInUser({ email: 'plainuser1@example.com', number: '8888888880', role: 'User' })

        const res = await request(app)
            .get('/api/v1/resumes')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
    })

    it('an Admin is blocked from the resume library', async () => {
        const { token } = await createLoggedInUser({ email: 'admin1@example.com', number: '8888888881', role: 'Admin' })

        const res = await request(app)
            .get('/api/v1/resumes')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(403)
    })

    it('a Support user is blocked from the resume library', async () => {
        const { token } = await createLoggedInUser({ email: 'support1@example.com', number: '8888888882', role: 'Support' })

        const res = await request(app)
            .get('/api/v1/resumes')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(403)
    })

    it('an Admin is blocked from cover letters, job search, chat, feedback, and payment history', async () => {
        const { token } = await createLoggedInUser({ email: 'admin2@example.com', number: '8888888883', role: 'Admin' })

        const coverLetterRes = await request(app).get('/api/v1/cover-letter').set('Authorization', `Bearer ${token}`)
        expect(coverLetterRes.status).toBe(403)

        const chatRes = await request(app).get('/api/v1/chat').set('Authorization', `Bearer ${token}`)
        expect(chatRes.status).toBe(403)

        const feedbackRes = await request(app).get('/api/v1/feedback/status').set('Authorization', `Bearer ${token}`)
        expect(feedbackRes.status).toBe(403)

        const paymentRes = await request(app).get('/api/v1/payment/history').set('Authorization', `Bearer ${token}`)
        expect(paymentRes.status).toBe(403)

        const reviewsRes = await request(app).get('/api/v1/reviews').set('Authorization', `Bearer ${token}`)
        expect(reviewsRes.status).toBe(403)

        const leaderboardRes = await request(app).get('/api/v1/leaderboard').set('Authorization', `Bearer ${token}`)
        expect(leaderboardRes.status).toBe(403)
    })

    it('an Admin can still reach account-management routes (profile, notifications)', async () => {
        const { token } = await createLoggedInUser({ email: 'admin3@example.com', number: '8888888884', role: 'Admin' })

        const profileRes = await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${token}`)
        expect(profileRes.status).toBe(200)

        const notificationsRes = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`)
        expect(notificationsRes.status).toBe(200)
    })

    it('admin dashboard routes remain unaffected by isUser (isAdmin/isSupport still gate those separately)', async () => {
        const { token } = await createLoggedInUser({ email: 'admin4@example.com', number: '8888888885', role: 'Admin' })

        const res = await request(app)
            .get('/api/v1/admin/stats')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
    })
})
