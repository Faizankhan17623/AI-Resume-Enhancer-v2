const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const {
    getReviews,
    getProgress,
    getReview,
    downloadReviewPdf,
    toggleShare,
    getPublicReview
} = require('../controllers/Review.js')
const { getStreak } = require('../controllers/Streak.js')
const { getLeaderboard } = require('../controllers/Leaderboard.js')

// review history, the score-progress graph and the PDF export live here sir

// NOTE: /reviews/progress must be registered BEFORE /reviews/:reviewId sir,
// otherwise express matches "progress" as a reviewId
route.get('/reviews', Auth, getReviews)
route.get('/reviews/progress', Auth, getProgress)
route.get('/reviews/:reviewId', Auth, getReview)
route.get('/reviews/:reviewId/pdf', Auth, downloadReviewPdf)
route.post('/reviews/:reviewId/share', Auth, toggleShare)

// public share card sir — NO Auth, this is the whole point, must stay behind shareId + isPublic only
route.get('/public/reviews/:shareId', getPublicReview)

// activity streak for the dashboard badge sir
route.get('/streak', Auth, getStreak)

// anonymized leaderboard sir
route.get('/leaderboard', Auth, getLeaderboard)

module.exports = route
