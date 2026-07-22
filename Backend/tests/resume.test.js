const request = require('supertest')
const PDFDocument = require('pdfkit')
const app = require('../index')
const User = require('../Models/User')
const Resume = require('../Models/Resume')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

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
        firstName: overrides.firstName || 'resumeowner',
        lastName: 'test',
        email: overrides.email || 'resumeowner@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number || '2222222220',
        CountryCode: '+91',
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token, userId: loginRes.body.user.id }
}

describe('POST /api/v1/resumes', () => {
    it('requires auth', async () => {
        const res = await request(app).post('/api/v1/resumes')
        expect(res.status).toBe(401)
    })

    it('rejects a request with no file', async () => {
        const { token } = await createLoggedInUser()
        const res = await request(app)
            .post('/api/v1/resumes')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(400)
    })

    it('saves the first resume as the default', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'first@example.com', number: '2222222221' })
        const pdfBuffer = await buildTestPdfBuffer('My resume content.')

        const res = await request(app)
            .post('/api/v1/resumes')
            .set('Authorization', `Bearer ${token}`)
            .attach('PDf', pdfBuffer, 'my-resume.pdf')

        expect(res.status).toBe(201)
        expect(res.body.resume.isDefault).toBe(true)

        const stored = await Resume.findOne({ user: userId })
        expect(stored).not.toBeNull()
        expect(stored.isDefault).toBe(true)
    })

    it('does not make the second resume the default', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'second@example.com', number: '2222222222' })
        const pdfBuffer1 = await buildTestPdfBuffer('First resume.')
        const pdfBuffer2 = await buildTestPdfBuffer('Second resume.')

        await request(app).post('/api/v1/resumes').set('Authorization', `Bearer ${token}`).attach('PDf', pdfBuffer1, 'r1.pdf')
        const res2 = await request(app).post('/api/v1/resumes').set('Authorization', `Bearer ${token}`).attach('PDf', pdfBuffer2, 'r2.pdf')

        expect(res2.body.resume.isDefault).toBe(false)

        const defaults = await Resume.find({ user: userId, isDefault: true })
        expect(defaults).toHaveLength(1)
    })
})

describe('GET /api/v1/resumes', () => {
    it('never returns resumeText in the list, and only the caller\'s own resumes', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'lister@example.com', number: '2222222223' })
        const { userId: otherUserId } = await createLoggedInUser({ email: 'otherowner@example.com', number: '2222222224' })

        await Resume.create({ user: userId, label: 'Mine', originalFilename: 'mine.pdf', resumeText: 'secret text', isDefault: true })
        await Resume.create({ user: otherUserId, label: 'Not mine', originalFilename: 'other.pdf', resumeText: 'other secret', isDefault: true })

        const res = await request(app)
            .get('/api/v1/resumes')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.resumes).toHaveLength(1)
        expect(res.body.resumes[0].label).toBe('Mine')
        expect(res.body.resumes[0].resumeText).toBeUndefined()
    })
})

describe('PATCH /api/v1/resumes/:resumeId', () => {
    it('renames a resume', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'renamer@example.com', number: '2222222225' })
        const resume = await Resume.create({ user: userId, label: 'Old name', originalFilename: 'r.pdf', resumeText: 'text', isDefault: true })

        const res = await request(app)
            .patch(`/api/v1/resumes/${resume._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'New name' })

        expect(res.status).toBe(200)
        expect(res.body.resume.label).toBe('New name')
    })

    it('setting a new default un-defaults the previous one', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'defaultswitcher@example.com', number: '2222222226' })
        const resumeA = await Resume.create({ user: userId, label: 'A', originalFilename: 'a.pdf', resumeText: 'text a', isDefault: true })
        const resumeB = await Resume.create({ user: userId, label: 'B', originalFilename: 'b.pdf', resumeText: 'text b', isDefault: false })

        await request(app)
            .patch(`/api/v1/resumes/${resumeB._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ isDefault: true })

        const refreshedA = await Resume.findById(resumeA._id)
        const refreshedB = await Resume.findById(resumeB._id)
        expect(refreshedA.isDefault).toBe(false)
        expect(refreshedB.isDefault).toBe(true)
    })

    it('returns 404 for a resume owned by someone else', async () => {
        const { token } = await createLoggedInUser({ email: 'attacker@example.com', number: '2222222227' })
        const { userId: victimId } = await createLoggedInUser({ email: 'victim@example.com', number: '2222222228' })
        const victimResume = await Resume.create({ user: victimId, label: 'Victim resume', originalFilename: 'v.pdf', resumeText: 'text', isDefault: true })

        const res = await request(app)
            .patch(`/api/v1/resumes/${victimResume._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'Hijacked' })

        expect(res.status).toBe(404)
    })
})

describe('DELETE /api/v1/resumes/:resumeId', () => {
    it('promotes the next-most-recent resume to default when the default is deleted', async () => {
        const { token, userId } = await createLoggedInUser({ email: 'deleter@example.com', number: '2222222229' })
        const older = await Resume.create({ user: userId, label: 'Older', originalFilename: 'o.pdf', resumeText: 'text', isDefault: false, createdAt: new Date(Date.now() - 10000) })
        const newest = await Resume.create({ user: userId, label: 'Newest (default)', originalFilename: 'n.pdf', resumeText: 'text', isDefault: true })

        const res = await request(app)
            .delete(`/api/v1/resumes/${newest._id}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)

        const refreshedOlder = await Resume.findById(older._id)
        expect(refreshedOlder.isDefault).toBe(true)
    })
})
