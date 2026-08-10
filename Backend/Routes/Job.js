const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isUser } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    createJobSchema,
    updateJobSchema,
    applyToJobSchema,
} = require('../Validation/schemas.js')
const {
    createJob,
    listMyJobs,
    getJob,
    updateJob,
    publishJob,
    closeJob,
    getJobApplicants,
    inviteApplicantToTest,
    listPublicJobs,
    getPublicJob,
    applyToJob,
    listMyApplications,
} = require('../controllers/Job.js')

// job postings sir — recruiter-management routes are isRecruiter only, public routes need no
// auth at all, candidate routes are isUser only. Same strict role isolation as Routes/Test.js.
//
// route ORDER matters here sir: '/jobs/mine' and '/jobs/public/:jobId' must be declared before
// '/jobs/:jobId', otherwise Express would match 'mine'/'public' as a :jobId value first.

// recruiter management
route.post('/jobs', Auth, isRecruiter, validate({ body: createJobSchema }), createJob)
route.get('/jobs/mine', Auth, isRecruiter, listMyJobs)
route.get('/jobs/:jobId/applicants', Auth, isRecruiter, getJobApplicants)
route.post('/jobs/:jobId/publish', Auth, isRecruiter, publishJob)
route.post('/jobs/:jobId/close', Auth, isRecruiter, closeJob)
route.patch('/jobs/:jobId', Auth, isRecruiter, validate({ body: updateJobSchema }), updateJob)
route.get('/jobs/:jobId', Auth, isRecruiter, getJob)

// public — no auth required
route.get('/public/jobs', listPublicJobs)
route.get('/public/jobs/:jobId', getPublicJob)

// candidate side
route.post('/jobs/:jobId/apply', Auth, isUser, validate({ body: applyToJobSchema }), applyToJob)
route.get('/job-applications/mine', Auth, isUser, listMyApplications)
route.post('/job-applications/:applicationId/invite', Auth, isRecruiter, inviteApplicantToTest)

module.exports = route
