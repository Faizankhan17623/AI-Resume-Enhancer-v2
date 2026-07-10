const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    generateCoverLetter,
    getCoverLetters,
    getCoverLetter
} = require('../controllers/CoverLetter.js')

// AI-drafted cover letters sir — Pro+ feature, gated inside the controller

route.post('/cover-letter', aiLimiter, Auth, generateCoverLetter)
route.get('/cover-letter', Auth, getCoverLetters)
route.get('/cover-letter/:coverLetterId', Auth, getCoverLetter)

module.exports = route
