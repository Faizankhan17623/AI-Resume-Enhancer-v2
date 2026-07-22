const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const Notification = require('../Models/Notification')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: 'notifyuser',
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

describe('GET /api/v1/notifications', () => {
    it('requires auth', async () => {
        const res = await request(app).get('/api/v1/notifications')
        expect(res.status).toBe(401)
    })

    it('only returns the caller\'s own notifications, newest first, with an unread count', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'bellowner@example.com', number: '6666666660' })
        const { userId: otherUserId } = await createLoggedInUser({ email: 'notmine@example.com', number: '6666666661' })

        await Notification.create({ user: otherUserId, type: 'system', title: 'Not mine' })
        await Notification.create({ user: userId, type: 'streak-break', title: 'Older', read: true, createdAt: new Date(Date.now() - 10000) })
        await Notification.create({ user: userId, type: 'digest', title: 'Newer' })

        const res = await request(app)
            .get('/api/v1/notifications')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.notifications).toHaveLength(2)
        expect(res.body.notifications[0].title).toBe('Newer')
        expect(res.body.unreadCount).toBe(1)
    })
})

describe('GET /api/v1/notifications/unread-count', () => {
    it('returns just the count, cheap for polling', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'polluser@example.com', number: '6666666662' })
        await Notification.create({ user: userId, type: 'system', title: 'One' })
        await Notification.create({ user: userId, type: 'system', title: 'Two' })

        const res = await request(app)
            .get('/api/v1/notifications/unread-count')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.unreadCount).toBe(2)
    })
})

describe('PATCH /api/v1/notifications/:notificationId/read', () => {
    it('marks one notification read, scoped to the owner', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'markreader@example.com', number: '6666666663' })
        const notification = await Notification.create({ user: userId, type: 'system', title: 'Read me' })

        const res = await request(app)
            .patch(`/api/v1/notifications/${notification._id}/read`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        const updated = await Notification.findById(notification._id)
        expect(updated.read).toBe(true)
    })

    it('returns 404 for a notification owned by someone else', async () => {
        const { token } = await createLoggedInUser({ email: 'nosy@example.com', number: '6666666664' })
        const { userId: victimId } = await createLoggedInUser({ email: 'notifyvictim@example.com', number: '6666666665' })
        const victimNotification = await Notification.create({ user: victimId, type: 'system', title: 'Not yours' })

        const res = await request(app)
            .patch(`/api/v1/notifications/${victimNotification._id}/read`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(404)
    })
})

describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks every unread notification read for the caller only', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'markalluser@example.com', number: '6666666666' })
        const { userId: otherUserId } = await createLoggedInUser({ email: 'untouched@example.com', number: '6666666667' })

        await Notification.create({ user: userId, type: 'system', title: 'A' })
        await Notification.create({ user: userId, type: 'system', title: 'B' })
        const otherNotification = await Notification.create({ user: otherUserId, type: 'system', title: 'C' })

        const res = await request(app)
            .patch('/api/v1/notifications/read-all')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)

        const mine = await Notification.find({ user: userId })
        expect(mine.every((n) => n.read)).toBe(true)

        const untouched = await Notification.findById(otherNotification._id)
        expect(untouched.read).toBe(false)
    })
})
