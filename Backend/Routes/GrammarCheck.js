const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { grammarCheckLimiter } = require('../Middlewares/RateLimit.js')
const { checkGrammar } = require('../controllers/GrammarCheck.js')

// free instant grammar/spell pre-check sir — no Groq call, no credit spent, so no aiLimiter,
// but it still parses an uploaded PDF so it gets its own tighter cap (grammarCheckLimiter)
route.post('/grammar-check', Auth, grammarCheckLimiter, checkGrammar)

module.exports = route
