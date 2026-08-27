const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isApprovedRecruiter } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { generateJobDescriptionSchema, generateInterviewQuestionsSchema } = require('../Validation/schemas.js')
const {
    generateJobDescription,
    generateInterviewQuestions,
    generateCandidateSummary,
} = require('../controllers/RecruiterAI.js')

// three Recruiter-side AI tools sir — Pro/ProMax upsells (see utils/RecruiterPlans.js for the
// per-tier monthly quota each one draws from). aiLimiter same as every other AI route in this
// app, on top of the monthly cap, for burst protection.
route.post('/recruiter-ai/job-description', Auth, isRecruiter, isApprovedRecruiter, aiLimiter, validate({ body: generateJobDescriptionSchema }), generateJobDescription)
route.post('/recruiter-ai/interview-questions', Auth, isRecruiter, isApprovedRecruiter, aiLimiter, validate({ body: generateInterviewQuestionsSchema }), generateInterviewQuestions)
route.get('/recruiter-ai/applications/:applicationId/summary', Auth, isRecruiter, isApprovedRecruiter, aiLimiter, generateCandidateSummary)

module.exports = route
