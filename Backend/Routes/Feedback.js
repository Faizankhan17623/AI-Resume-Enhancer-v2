const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { getFeedbackStatus, submitFeedback } = require('../controllers/Feedback.js')

// in-app feedback popup sir — star rating + referral score, nagging cadence handled server-side

route.get('/feedback/status', Auth, getFeedbackStatus)
route.post('/feedback', Auth, submitFeedback)

module.exports = route
