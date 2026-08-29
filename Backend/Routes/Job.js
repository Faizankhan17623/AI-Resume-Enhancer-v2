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
    deleteJob,
    getJobApplicants,
    getJobAnalytics,
    getRecruiterOverviewAnalytics,
    inviteApplicantToTest,
    toggleShortlist,
    setApplicationOutcome,
    bulkInviteApplicantsToTest,
    bulkSetApplicationOutcome,
    listPublicJobs,
    getPublicJob,
    applyToJob,
    listMyApplications,
} = require('../controllers/Job.js')

// applyToJob is multipart/form-data sir (the resume PDF rides as req.files.resume, alongside the
// structured form fields) — express-fileupload puts the OTHER form fields on req.body as plain
// strings, so the structured payload is sent as a single JSON-stringified 'data' field and parsed
// back into an object HERE, before the validate() middleware's Zod schema ever sees it.
const parseMultipartJson = (req, res, next) => {
    if (typeof req.body?.data === 'string') {
        try {
            req.body = JSON.parse(req.body.data)
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid application data' })
        }
    }
    next()
}

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
route.get('/jobs/analytics-overview', Auth, isRecruiter, isApprovedRecruiter, getRecruiterOverviewAnalytics)
route.get('/jobs/:jobId/applicants', Auth, isRecruiter, isApprovedRecruiter, getJobApplicants)
route.post('/jobs/:jobId/applicants/bulk-invite', Auth, isRecruiter, isApprovedRecruiter, validate({ body: bulkInviteApplicantsSchema }), bulkInviteApplicantsToTest)
route.patch('/jobs/:jobId/applicants/bulk-status', Auth, isRecruiter, isApprovedRecruiter, validate({ body: bulkApplicationOutcomeSchema }), bulkSetApplicationOutcome)
route.get('/jobs/:jobId/analytics', Auth, isRecruiter, isApprovedRecruiter, getJobAnalytics)
route.post('/jobs/:jobId/publish', Auth, isRecruiter, isApprovedRecruiter, publishJob)
route.post('/jobs/:jobId/close', Auth, isRecruiter, isApprovedRecruiter, closeJob)
route.delete('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, deleteJob)
route.patch('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, validate({ body: updateJobSchema }), updateJob)
route.get('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, getJob)

// public — no auth required
route.get('/public/jobs', listPublicJobs)
route.get('/public/jobs/:jobId', getPublicJob)

// candidate side
route.post('/jobs/:jobId/apply', Auth, isUser, parseMultipartJson, validate({ body: applyToJobSchema }), applyToJob)
route.get('/job-applications/mine', Auth, isUser, listMyApplications)
route.post('/job-applications/:applicationId/invite', Auth, isRecruiter, isApprovedRecruiter, inviteApplicantToTest)
route.patch('/job-applications/:applicationId/shortlist', Auth, isRecruiter, isApprovedRecruiter, toggleShortlist)
route.patch('/job-applications/:applicationId/status', Auth, isRecruiter, isApprovedRecruiter, validate({ body: setApplicationOutcomeSchema }), setApplicationOutcome)

module.exports = route
