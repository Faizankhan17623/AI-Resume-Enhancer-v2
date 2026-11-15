const express = require('express')
const route = express.Router()
const { Auth, isUserOrRecruiter } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { authedWriteLimiter } = require('../Middlewares/RateLimit.js')
const { sendMessageSchema } = require('../Validation/schemas.js')
const { getThread, sendMessage } = require('../controllers/Message.js')

// either role can call these sir — the controller itself (getThreadForCaller) checks
// which specific recruiter/candidate pair the caller actually belongs to
//
// authedWriteLimiter on the POST sir, per 2026-11-15 audit — this was the one write route in
// its group still relying on just the app-wide globalLimiter, unlike every sibling write route
route.get('/job-applications/:applicationId/messages', Auth, isUserOrRecruiter, getThread)
route.post('/job-applications/:applicationId/messages', Auth, isUserOrRecruiter, authedWriteLimiter, validate({ body: sendMessageSchema }), sendMessage)

module.exports = route
