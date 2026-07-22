const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    generateCoverLetter,
    getCoverLetters,
    getCoverLetter
} = require('../controllers/CoverLetter.js')

// AI-drafted cover letters sir — Pro+ feature, gated inside the controller.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.post('/cover-letter', aiLimiter, Auth, isUser, generateCoverLetter)
route.get('/cover-letter', Auth, isUser, getCoverLetters)
route.get('/cover-letter/:coverLetterId', Auth, isUser, getCoverLetter)

module.exports = route
