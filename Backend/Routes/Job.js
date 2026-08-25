const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isApprovedRecruiter, isUser } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    createJobSchema,
    updateJobSchema,
    applyToJobSchema,
    setApplicationOutcomeSchema,
    bulkInviteApplicantsSchema,
    bulkApplicationOutcomeSchema,
} = require('../Validation/schemas.js')
const {
    createJob,
    listMyJobs,
    getJob,
    updateJob,
    publishJob,
    closeJob,
    getJobApplicants,
    getJobAnalytics,
    inviteApplicantToTest,
    setApplicationOutcome,
    bulkInviteApplicantsToTest,
    bulkSetApplicationOutcome,
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

// recruiter management sir — isApprovedRecruiter chained right after isRecruiter on every one
// of these: isRecruiter confirms the role, isApprovedRecruiter confirms an Admin has actually
// cleared them (see Middlewares/Auth.js). A locked (pending/rejected) Recruiter 403s here.
route.post('/jobs', Auth, isRecruiter, isApprovedRecruiter, validate({ body: createJobSchema }), createJob)
route.get('/jobs/mine', Auth, isRecruiter, isApprovedRecruiter, listMyJobs)
route.get('/jobs/:jobId/applicants', Auth, isRecruiter, isApprovedRecruiter, getJobApplicants)
route.post('/jobs/:jobId/applicants/bulk-invite', Auth, isRecruiter, isApprovedRecruiter, validate({ body: bulkInviteApplicantsSchema }), bulkInviteApplicantsToTest)
route.patch('/jobs/:jobId/applicants/bulk-status', Auth, isRecruiter, isApprovedRecruiter, validate({ body: bulkApplicationOutcomeSchema }), bulkSetApplicationOutcome)
route.get('/jobs/:jobId/analytics', Auth, isRecruiter, isApprovedRecruiter, getJobAnalytics)
route.post('/jobs/:jobId/publish', Auth, isRecruiter, isApprovedRecruiter, publishJob)
route.post('/jobs/:jobId/close', Auth, isRecruiter, isApprovedRecruiter, closeJob)
route.patch('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, validate({ body: updateJobSchema }), updateJob)
route.get('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, getJob)

// public — no auth required
route.get('/public/jobs', listPublicJobs)
route.get('/public/jobs/:jobId', getPublicJob)

// candidate side
route.post('/jobs/:jobId/apply', Auth, isUser, validate({ body: applyToJobSchema }), applyToJob)
route.get('/job-applications/mine', Auth, isUser, listMyApplications)
route.post('/job-applications/:applicationId/invite', Auth, isRecruiter, isApprovedRecruiter, inviteApplicantToTest)
route.patch('/job-applications/:applicationId/status', Auth, isRecruiter, isApprovedRecruiter, validate({ body: setApplicationOutcomeSchema }), setApplicationOutcome)

module.exports = route
