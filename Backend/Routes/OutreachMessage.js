const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    generateOutreachMessage,
    getOutreachMessages,
    getOutreachMessage
} = require('../controllers/OutreachMessage.js')

// AI-drafted outreach messages sir — Pro+ feature, gated inside the controller.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.post('/outreach-message', aiLimiter, Auth, isUser, generateOutreachMessage)
route.get('/outreach-message', Auth, isUser, getOutreachMessages)
route.get('/outreach-message/:outreachMessageId', Auth, isUser, getOutreachMessage)

module.exports = route
