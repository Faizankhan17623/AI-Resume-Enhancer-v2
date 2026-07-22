const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { getFeedbackStatus, submitFeedback } = require('../controllers/Feedback.js')

// in-app feedback popup sir — star rating + referral score, nagging cadence handled server-side.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.get('/feedback/status', Auth, isUser, getFeedbackStatus)
route.post('/feedback', Auth, isUser, submitFeedback)

module.exports = route
