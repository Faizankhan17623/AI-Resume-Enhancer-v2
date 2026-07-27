const request = require('supertest')
const app = require('../index')
const User = require('../Models/User')
const BuiltResume = require('../Models/BuiltResume')

jest.mock('../utils/Nodemailer.js', () => jest.fn().mockResolvedValue(true))

const createLoggedInUser = async (overrides = {}) => {
    const bcrypt = require('bcrypt')
    const hashed = await bcrypt.hash('correct-password', 10)
    const user = await User.create({
        firstName: 'builder',
        lastName: 'test',
        email: overrides.email || 'builder@example.com',
        password: hashed,
        confirmpassword: hashed,
        number: overrides.number || '5555555555',
        CountryCode: '+91',
        ...overrides,
    })

    const loginRes = await request(app)
        .post('/api/v1/Login')
        .send({ email: user.email, password: 'correct-password' })

    return { token: loginRes.body.token }
}

describe('BuiltResume version history', () => {
    it('does not snapshot a version on the very first save (nothing to preserve yet)', async () => {
        const { token } = await createLoggedInUser()

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'First title', summary: 'First summary' })

        const versionsRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}/versions`)
            .set('Authorization', `Bearer ${token}`)

        // the resume existed before this save (created with default empty content), so ONE
        // snapshot of that pre-save empty state is expected — not zero, not two
        expect(versionsRes.body.versions.length).toBe(1)
    })

    it('does NOT snapshot again on a second save within the 15-minute gap (autosave-while-typing)', async () => {
        const { token } = await createLoggedInUser({ email: 'gap@example.com', number: '5555555556' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'edit one' })

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'edit two' })

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'edit three' })

        const versionsRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}/versions`)
            .set('Authorization', `Bearer ${token}`)

        // three saves in quick succession sir — only the FIRST one should have snapshotted
        // (the pre-save empty state), the next two are within the 15-min gap
        expect(versionsRes.body.versions.length).toBe(1)
    })

    it('DOES snapshot again once the 15-minute gap has actually passed', async () => {
        const { token } = await createLoggedInUser({ email: 'gapelapsed@example.com', number: '5555555557' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'edit one' })

        // simulate 16 minutes having passed sir — backdate the existing snapshot directly in
        // the DB rather than actually waiting, so the test stays fast
        const resume = await BuiltResume.findById(resumeId)
        resume.versions[0].savedAt = new Date(Date.now() - 16 * 60 * 1000)
        await resume.save()

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'edit two, after the gap' })

        const versionsRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}/versions`)
            .set('Authorization', `Bearer ${token}`)

        expect(versionsRes.body.versions.length).toBe(2)
    })

    it('caps stored versions at 5, dropping the oldest', async () => {
        const { token } = await createLoggedInUser({ email: 'cap@example.com', number: '5555555558' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        // force 6 snapshots directly sir — faster than 6 real 15-min-gapped saves
        for (let i = 0; i < 6; i++) {
            const resume = await BuiltResume.findById(resumeId)
            resume.versions.push({ title: `v${i}`, savedAt: new Date(Date.now() - (6 - i) * 20 * 60 * 1000) })
            await resume.save()
        }

        const versionsRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}/versions`)
            .set('Authorization', `Bearer ${token}`)

        expect(versionsRes.body.versions.length).toBe(6) // GET doesn't trim, only the save path does — confirm raw state first
        expect(versionsRes.body.versions[0].title).toBe('v5') // newest first

        // now trigger the trimming save path sir
        const resume = await BuiltResume.findById(resumeId)
        resume.versions[resume.versions.length - 1].savedAt = new Date(Date.now() - 20 * 60 * 1000)
        await resume.save()

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'one more save to trigger the cap' })

        const trimmedRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}/versions`)
            .set('Authorization', `Bearer ${token}`)

        expect(trimmedRes.body.versions.length).toBe(5)
    })

    it('restores content fields from a version but leaves templateId/color/photoUrl untouched', async () => {
        const { token } = await createLoggedInUser({ email: 'restore@example.com', number: '5555555559' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        // save 1 sir — snapshots the pre-save (empty) state, sets summary to "old summary"
        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'old summary', templateId: 'classic', color: '#111111' })

        const versionsRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}/versions`)
            .set('Authorization', `Bearer ${token}`)
        const versionId = versionsRes.body.versions[0]._id

        // save 2 sir — changes summary AND changes the template/color, simulating the user
        // picking a new look after writing more content
        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ summary: 'new summary', templateId: 'sidebar', color: '#222222' })

        const restoreRes = await request(app)
            .post(`/api/v1/built-resumes/${resumeId}/versions/${versionId}/restore`)
            .set('Authorization', `Bearer ${token}`)

        expect(restoreRes.status).toBe(200)
        expect(restoreRes.body.resume.summary).toBe('') // the snapshot was the PRE-save-1 empty state
        expect(restoreRes.body.resume.templateId).toBe('sidebar') // untouched by restore
        expect(restoreRes.body.resume.color).toBe('#222222') // untouched by restore
    })

    it('404s restoring a version that does not belong to the resume', async () => {
        const { token } = await createLoggedInUser({ email: 'badversion@example.com', number: '5555555560' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        const fakeVersionId = '507f1f77bcf86cd799439011'
        const res = await request(app)
            .post(`/api/v1/built-resumes/${resumeId}/versions/${fakeVersionId}/restore`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(404)
    })

    it('requires auth for the versions endpoints', async () => {
        const listRes = await request(app).get('/api/v1/built-resumes/507f1f77bcf86cd799439011/versions')
        expect(listRes.status).toBe(401)

        const restoreRes = await request(app).post('/api/v1/built-resumes/507f1f77bcf86cd799439011/versions/507f1f77bcf86cd799439012/restore')
        expect(restoreRes.status).toBe(401)
    })
})

describe('POST /api/v1/built-resumes/:resumeId/duplicate', () => {
    it('clones content and presentation but starts fresh version history', async () => {
        const { token } = await createLoggedInUser({ email: 'dup1@example.com', number: '5555555561' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${token}`)
            .send({ templateId: 'sidebar' })
        const resumeId = createRes.body.resume._id

        await request(app)
            .put(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Frontend Dev — Google',
                summary: 'Experienced frontend engineer',
                color: '#0b2545',
                templateId: 'sidebar',
                skills: ['React', 'TypeScript'],
            })

        const dupRes = await request(app)
            .post(`/api/v1/built-resumes/${resumeId}/duplicate`)
            .set('Authorization', `Bearer ${token}`)

        expect(dupRes.status).toBe(201)
        expect(dupRes.body.resume._id).not.toBe(resumeId)
        expect(dupRes.body.resume.title).toBe('Frontend Dev — Google (copy)')
        expect(dupRes.body.resume.summary).toBe('Experienced frontend engineer')
        expect(dupRes.body.resume.templateId).toBe('sidebar')
        expect(dupRes.body.resume.color).toBe('#0b2545')
        expect(dupRes.body.resume.skills).toEqual(['React', 'TypeScript'])
        expect(dupRes.body.resume.versions).toEqual([]) // fresh history sir, not inherited

        // original is untouched sir
        const originalRes = await request(app)
            .get(`/api/v1/built-resumes/${resumeId}`)
            .set('Authorization', `Bearer ${token}`)
        expect(originalRes.body.resume.title).toBe('Frontend Dev — Google')
    })

    it('does not let a user duplicate another user\'s resume', async () => {
        const { token: ownerToken } = await createLoggedInUser({ email: 'dupowner@example.com', number: '5555555562' })
        const { token: otherToken } = await createLoggedInUser({ email: 'dupother@example.com', number: '5555555563' })

        const createRes = await request(app)
            .post('/api/v1/built-resumes')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ templateId: 'classic' })
        const resumeId = createRes.body.resume._id

        const res = await request(app)
            .post(`/api/v1/built-resumes/${resumeId}/duplicate`)
            .set('Authorization', `Bearer ${otherToken}`)

        expect(res.status).toBe(404)
    })

    it('requires auth', async () => {
        const res = await request(app).post('/api/v1/built-resumes/507f1f77bcf86cd799439011/duplicate')
        expect(res.status).toBe(401)
    })
})
