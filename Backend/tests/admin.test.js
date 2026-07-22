const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: overrides.firstName || 'plainuser',
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

    return { token: loginRes.body.token, userId: loginRes.body.user.id, user }
}

const createAdmin = (overrides = {}) => createLoggedInUser({ role: 'Admin', ...overrides })
const createSupport = (overrides = {}) => createLoggedInUser({ role: 'Support', ...overrides })

describe('Admin RBAC gating', () => {
    it('rejects a plain User from every admin route', async () => {
        const { token } = await createLoggedInUser({ email: 'plain@example.com', number: '5555555550' })

        const res = await request(app)
            .get('/api/v1/admin/stats')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(403)
    })

    it('lets a Support user read stats but blocks a write-only-for-Admin route', async () => {
        const { token } = await createSupport({ email: 'support1@example.com', number: '5555555551' })

        const readRes = await request(app)
            .get('/api/v1/admin/stats')
            .set('Authorization', `Bearer ${token}`)
        expect(readRes.status).toBe(200)

        const { userId: targetId } = await createLoggedInUser({ email: 'roletarget1@example.com', number: '5555555552' })
        const writeRes = await request(app)
            .patch(`/api/v1/admin/users/${targetId}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'Support' })
        expect(writeRes.status).toBe(403)
    })

    it('lets an Admin hit both read and write routes', async () => {
        const { token } = await createAdmin({ email: 'admin1@example.com', number: '5555555553' })
        const { userId: targetId } = await createLoggedInUser({ email: 'roletarget2@example.com', number: '5555555554' })

        const res = await request(app)
            .patch(`/api/v1/admin/users/${targetId}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'Support' })

        expect(res.status).toBe(200)
        const updated = await User.findById(targetId)
        expect(updated.role).toBe('Support')
    })
})

describe('PATCH /admin/users/:userId/role', () => {
    it('refuses an admin demoting themselves', async () => {
        const { token, userId } = await createAdmin({ email: 'selfdemote@example.com', number: '5555555555' })

        const res = await request(app)
            .patch(`/api/v1/admin/users/${userId}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'User' })

        expect(res.status).toBe(400)
        const stillAdmin = await User.findById(userId)
        expect(stillAdmin.role).toBe('Admin')
    })

    it('rejects an invalid role value', async () => {
        const { token } = await createAdmin({ email: 'invalidrole@example.com', number: '5555555556' })
        const { userId: targetId } = await createLoggedInUser({ email: 'roletarget3@example.com', number: '5555555557' })

        const res = await request(app)
            .patch(`/api/v1/admin/users/${targetId}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'SuperAdmin' })

        expect(res.status).toBe(400)
    })
})

describe('PATCH /admin/users/:userId/ban', () => {
    it('refuses an admin banning themselves', async () => {
        const { token, userId } = await createAdmin({ email: 'selfban@example.com', number: '5555555558' })

        const res = await request(app)
            .patch(`/api/v1/admin/users/${userId}/ban`)
            .set('Authorization', `Bearer ${token}`)
            .send({ banned: true, reason: 'test' })

        expect(res.status).toBe(400)
    })

    it('refuses banning another Admin (must demote first)', async () => {
        const { token } = await createAdmin({ email: 'banner@example.com', number: '5555555559' })
        const { userId: otherAdminId } = await createAdmin({ email: 'targetadmin@example.com', number: '5555555560' })

        const res = await request(app)
            .patch(`/api/v1/admin/users/${otherAdminId}/ban`)
            .set('Authorization', `Bearer ${token}`)
            .send({ banned: true, reason: 'test' })

        expect(res.status).toBe(400)
    })

    it('bans a normal user with a reason, and a banned user is then blocked everywhere', async () => {
        const { token: adminToken } = await createAdmin({ email: 'banner2@example.com', number: '5555555561' })
        const { token: targetToken, userId: targetId } = await createLoggedInUser({ email: 'bantarget@example.com', number: '5555555562' })

        const banRes = await request(app)
            .patch(`/api/v1/admin/users/${targetId}/ban`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ banned: true, reason: 'abuse' })

        expect(banRes.status).toBe(200)

        // the banned user's OWN existing token should now be rejected by Auth middleware sir
        const profileRes = await request(app)
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${targetToken}`)

        expect(profileRes.status).toBe(403)
    })
})

describe('PATCH /admin/users/:userId/credits', () => {
    it('adjusts a user\'s credit count, floored at 0', async () => {
        const { token } = await createSupport({ email: 'creditadjuster@example.com', number: '5555555563' })
        const { userId: targetId } = await createLoggedInUser({ email: 'creditor@example.com', number: '5555555564' })
        await User.findByIdAndUpdate(targetId, { count: 2 })

        const res = await request(app)
            .patch(`/api/v1/admin/users/${targetId}/credits`)
            .set('Authorization', `Bearer ${token}`)
            .send({ delta: -5 })

        expect(res.status).toBe(200)
        const updated = await User.findById(targetId)
        expect(updated.count).toBe(0)
    })
})

describe('DELETE /admin/users/:userId', () => {
    it('refuses an admin deleting themselves', async () => {
        const { token, userId } = await createAdmin({ email: 'selfdelete@example.com', number: '5555555565' })

        const res = await request(app)
            .delete(`/api/v1/admin/users/${userId}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(400)
        const stillThere = await User.findById(userId)
        expect(stillThere).not.toBeNull()
    })

    it('a Support user cannot delete (Admin-only route)', async () => {
        const { token } = await createSupport({ email: 'supportdeleter@example.com', number: '5555555566' })
        const { userId: targetId } = await createLoggedInUser({ email: 'deletetarget@example.com', number: '5555555567' })

        const res = await request(app)
            .delete(`/api/v1/admin/users/${targetId}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(403)
        const stillThere = await User.findById(targetId)
        expect(stillThere).not.toBeNull()
    })
})
