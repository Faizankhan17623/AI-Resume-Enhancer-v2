const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    startMockInterview,
    answerMockInterview,
    getMockInterviews,
    getMockInterview,
    deleteMockInterview
} = require('../controllers/MockInterview.js')

// structured mock interview sessions sir — ProMax only (enforced in the controller),
// isUser blocks Admin/Support, this is a product feature, strictly User-only

// both of these hit Groq sir so they get the AI rate limit
route.post('/mock-interview', aiLimiter, Auth, isUser, startMockInterview)
route.post('/mock-interview/:sessionId/answer', aiLimiter, Auth, isUser, answerMockInterview)
route.get('/mock-interview', Auth, isUser, getMockInterviews)
route.get('/mock-interview/:sessionId', Auth, isUser, getMockInterview)
route.delete('/mock-interview/:sessionId', Auth, isUser, deleteMockInterview)

module.exports = route
