const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const {
    getKeywordBank,
    updateKeywordStatus
} = require('../controllers/KeywordBank.js')

// the keyword bank sir — synced automatically whenever a review runs (see utils/KeywordBank.js's
// syncKeywordBankFromReview, hooked into controllers/AI.js's runReview). No AI call happens in
// this file itself, so no dedicated limiter beyond the app-wide globalLimiter.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.get('/keyword-bank', Auth, isUser, getKeywordBank)
route.patch('/keyword-bank/:itemId', Auth, isUser, updateKeywordStatus)

module.exports = route
