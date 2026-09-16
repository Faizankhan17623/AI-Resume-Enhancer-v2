const express = require('express')
const route = express.Router()
const { Auth, isUserOrRecruiter } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { sendMessageSchema } = require('../Validation/schemas.js')
const { getThread, sendMessage } = require('../controllers/Message.js')

// either role can call these sir — the controller itself (getThreadForCaller) checks
// which specific recruiter/candidate pair the caller actually belongs to
route.get('/job-applications/:applicationId/messages', Auth, isUserOrRecruiter, getThread)
route.post('/job-applications/:applicationId/messages', Auth, isUserOrRecruiter, validate({ body: sendMessageSchema }), sendMessage)

module.exports = route
