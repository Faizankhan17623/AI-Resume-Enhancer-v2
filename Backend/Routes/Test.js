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
route.get('/test-attempts/:attemptId', Auth, isRecruiter, isApprovedRecruiter, getAttemptDetail)

// candidate attempt flow
// preview MUST be registered before start sir — no route conflict here since one's GET and one's
// POST, just keeping the read-only check next to the state-changing one for clarity
route.get('/test-attempts/speed-probe', Auth, isUser, speedProbeLimiter, speedProbe)
route.get('/test-attempts/preview/:inviteCode', Auth, isUser, previewTest)
route.post('/test-attempts/start/:inviteCode', Auth, isUser, startAttempt)
route.post('/test-attempts/:attemptId/answers', Auth, isUser, validate({ body: submitAnswersSchema }), submitAnswers)
// multipart upload (snapshot image) sir — no JSON body schema to validate, controller checks the file itself
route.post('/test-attempts/:attemptId/violations', Auth, isUser, violationLimiter, logViolation)

module.exports = route
