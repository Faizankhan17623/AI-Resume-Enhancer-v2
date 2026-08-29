const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isApprovedRecruiter, isUser } = require('../Middlewares/Auth.js')
const { violationLimiter, speedProbeLimiter } = require('../Middlewares/RateLimit.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    createTestSchema,
    updateTestSchema,
    submitAnswersSchema,
} = require('../Validation/schemas.js')
const {
    createTest,
    listMyTests,
    getTest,
    updateTest,
    publishTest,
    getTestAttempts,
    getAttemptDetail,
    previewTest,
    speedProbe,
    startAttempt,
    submitAnswers,
    logViolation,
} = require('../controllers/Test.js')

// recruiter proctored tests sir — recruiter-management routes are isRecruiter only,
// candidate-attempt routes are isUser only (candidates are plain 'User' accounts), same strict
// role isolation as every other domain (see Middlewares/Auth.js)

// recruiter management sir — isApprovedRecruiter chained right after isRecruiter on every one
// of these: isRecruiter confirms the role, isApprovedRecruiter confirms an Admin has actually
// cleared them (see Middlewares/Auth.js). A locked (pending/rejected) Recruiter 403s here.
route.post('/tests', Auth, isRecruiter, isApprovedRecruiter, validate({ body: createTestSchema }), createTest)
route.get('/tests', Auth, isRecruiter, isApprovedRecruiter, listMyTests)
route.get('/tests/:testId', Auth, isRecruiter, isApprovedRecruiter, getTest)
route.patch('/tests/:testId', Auth, isRecruiter, isApprovedRecruiter, validate({ body: updateTestSchema }), updateTest)
route.post('/tests/:testId/publish', Auth, isRecruiter, isApprovedRecruiter, publishTest)
route.get('/tests/:testId/attempts', Auth, isRecruiter, isApprovedRecruiter, getTestAttempts)

// candidate attempt flow
// speed-probe MUST be registered BEFORE '/test-attempts/:attemptId' below sir — found live via
// actual browser testing against production: Express matches routes in REGISTRATION order, and
// ':attemptId' is a wildcard that matches ANY single path segment, including the literal string
// "speed-probe". With getAttemptDetail's isRecruiter-gated route registered first, GET
// /test-attempts/speed-probe matched THAT route (treating "speed-probe" as if it were an
// attemptId) and 403'd every real candidate with "This route is for recruiters only" - not the
// isUser-gated speedProbe handler below at all. The route-collision checker in Routes/index.js
// didn't catch this because it only flags two routers declaring the exact same method+path
// signature; a same-router wildcard silently shadowing a later literal path is a different
// failure shape entirely. (preview/:inviteCode below never had this problem - it's a two-segment
// path, ':attemptId' only ever matches one segment - registering it here too just keeps every
// GET /test-attempts/* route grouped together.)
route.get('/test-attempts/speed-probe', Auth, isUser, speedProbeLimiter, speedProbe)
route.get('/test-attempts/preview/:inviteCode', Auth, isUser, previewTest)
route.get('/test-attempts/:attemptId', Auth, isRecruiter, isApprovedRecruiter, getAttemptDetail)
route.post('/test-attempts/start/:inviteCode', Auth, isUser, startAttempt)
route.post('/test-attempts/:attemptId/answers', Auth, isUser, validate({ body: submitAnswersSchema }), submitAnswers)
// multipart upload (snapshot image) sir — no JSON body schema to validate, controller checks the file itself
route.post('/test-attempts/:attemptId/violations', Auth, isUser, violationLimiter, logViolation)

module.exports = route
