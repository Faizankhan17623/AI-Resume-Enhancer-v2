const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isUser } = require('../Middlewares/Auth.js')
const { violationLimiter } = require('../Middlewares/RateLimit.js')
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
    startAttempt,
    submitAnswers,
    logViolation,
} = require('../controllers/Test.js')

// recruiter proctored tests sir — recruiter-management routes are isRecruiter only,
// candidate-attempt routes are isUser only (candidates are plain 'User' accounts), same strict
// role isolation as every other domain (see Middlewares/Auth.js)

// recruiter management
route.post('/tests', Auth, isRecruiter, validate({ body: createTestSchema }), createTest)
route.get('/tests', Auth, isRecruiter, listMyTests)
route.get('/tests/:testId', Auth, isRecruiter, getTest)
route.patch('/tests/:testId', Auth, isRecruiter, validate({ body: updateTestSchema }), updateTest)
route.post('/tests/:testId/publish', Auth, isRecruiter, publishTest)
route.get('/tests/:testId/attempts', Auth, isRecruiter, getTestAttempts)
route.get('/test-attempts/:attemptId', Auth, isRecruiter, getAttemptDetail)

// candidate attempt flow
route.post('/test-attempts/start/:inviteCode', Auth, isUser, startAttempt)
route.post('/test-attempts/:attemptId/answers', Auth, isUser, validate({ body: submitAnswersSchema }), submitAnswers)
// multipart upload (snapshot image) sir — no JSON body schema to validate, controller checks the file itself
route.post('/test-attempts/:attemptId/violations', Auth, isUser, violationLimiter, logViolation)

module.exports = route
