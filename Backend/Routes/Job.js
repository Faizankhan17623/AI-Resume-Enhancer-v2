const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isApprovedRecruiter, isUser } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    createJobSchema,
    updateJobSchema,
    applyToJobSchema,
    setApplicationOutcomeSchema,
    updateApplicantNotesSchema,
    bulkInviteApplicantsSchema,
    bulkApplicationOutcomeSchema,
    updateInterviewEligibilitySchema,
    sendJobInviteSchema,
} = require('../Validation/schemas.js')
const {
    createJob,
    listMyJobs,
    getJob,
    updateJob,
    publishJob,
    closeJob,
    closeExpiredJobsForRecruiter,
    deleteJob,
    getJobApplicants,
    getJobAnalytics,
    getRecruiterOverviewAnalytics,
    inviteApplicantToTest,
    toggleShortlist,
    updateApplicantNotes,
    setApplicationOutcome,
    bulkInviteApplicantsToTest,
    bulkSetApplicationOutcome,
    listPublicJobs,
    getPublicJob,
    applyToJob,
    listMyApplications,
    updateInterviewEligibilityThreshold,
    toggleSavedJob,
    listSavedJobs,
} = require('../controllers/Job.js')
const {
    sendJobInvite,
    listJobInvites,
    getJobInviteByToken,
} = require('../controllers/JobInvite.js')

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
route.post('/jobs/close-expired', Auth, isRecruiter, isApprovedRecruiter, closeExpiredJobsForRecruiter)
route.get('/jobs/analytics-overview', Auth, isRecruiter, isApprovedRecruiter, getRecruiterOverviewAnalytics)
route.get('/jobs/:jobId/applicants', Auth, isRecruiter, isApprovedRecruiter, getJobApplicants)
route.post('/jobs/:jobId/applicants/bulk-invite', Auth, isRecruiter, isApprovedRecruiter, validate({ body: bulkInviteApplicantsSchema }), bulkInviteApplicantsToTest)
route.patch('/jobs/:jobId/applicants/bulk-status', Auth, isRecruiter, isApprovedRecruiter, validate({ body: bulkApplicationOutcomeSchema }), bulkSetApplicationOutcome)
route.get('/jobs/:jobId/analytics', Auth, isRecruiter, isApprovedRecruiter, getJobAnalytics)
route.post('/jobs/:jobId/publish', Auth, isRecruiter, isApprovedRecruiter, publishJob)
route.post('/jobs/:jobId/close', Auth, isRecruiter, isApprovedRecruiter, closeJob)
route.delete('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, deleteJob)
route.patch('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, validate({ body: updateJobSchema }), updateJob)
// works regardless of draft/published status sir — see controllers/Job.js's own comment on why
// this can't just be folded into updateJob above
route.patch('/jobs/:jobId/interview-eligibility', Auth, isRecruiter, isApprovedRecruiter, validate({ body: updateInterviewEligibilitySchema }), updateInterviewEligibilityThreshold)
// candidate's saved jobs sir — MUST be declared before 'GET /jobs/:jobId' below, otherwise
// Express matches :jobId='saved' first and this route is silently unreachable (verified: Express
// matches path patterns in REGISTRATION order regardless of role-check middleware differences)
route.get('/jobs/saved', Auth, isUser, listSavedJobs)
route.get('/jobs/:jobId', Auth, isRecruiter, isApprovedRecruiter, getJob)

route.patch('/jobs/:jobId/save', Auth, isUser, toggleSavedJob)

// invite-only job invites sir — recruiter-managed, see Models/Job.js's visibility field and
// controllers/JobInvite.js. Declared before '/jobs/:jobId' above already covers these since
// they're all sub-paths of a specific :jobId, so no route-order conflict.
route.post('/jobs/:jobId/invite', Auth, isRecruiter, isApprovedRecruiter, validate({ body: sendJobInviteSchema }), sendJobInvite)
route.get('/jobs/:jobId/invites', Auth, isRecruiter, isApprovedRecruiter, listJobInvites)

// public — no auth required
route.get('/public/jobs', listPublicJobs)
route.get('/public/jobs/invite/:token', getJobInviteByToken)
route.get('/public/jobs/:jobId', getPublicJob)

// candidate side
route.post('/jobs/:jobId/apply', Auth, isUser, parseMultipartJson, validate({ body: applyToJobSchema }), applyToJob)
route.get('/job-applications/mine', Auth, isUser, listMyApplications)
route.post('/job-applications/:applicationId/invite', Auth, isRecruiter, isApprovedRecruiter, inviteApplicantToTest)
route.patch('/job-applications/:applicationId/shortlist', Auth, isRecruiter, isApprovedRecruiter, toggleShortlist)
route.patch('/job-applications/:applicationId/notes', Auth, isRecruiter, isApprovedRecruiter, validate({ body: updateApplicantNotesSchema }), updateApplicantNotes)
route.patch('/job-applications/:applicationId/status', Auth, isRecruiter, isApprovedRecruiter, validate({ body: setApplicationOutcomeSchema }), setApplicationOutcome)

module.exports = route
