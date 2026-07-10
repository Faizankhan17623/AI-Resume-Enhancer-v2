const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { checkGrammar } = require('../controllers/GrammarCheck.js')

// free instant grammar/spell pre-check sir — no Groq call, no credit spent, so no aiLimiter here
route.post('/grammar-check', Auth, checkGrammar)

module.exports = route
