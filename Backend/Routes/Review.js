const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const {
    getReviews,
    getProgress,
    getReview,
    downloadReviewPdf,
    toggleShare,
    updateShareAudience,
    getPublicReview
} = require('../controllers/Review.js')
const { getStreak } = require('../controllers/Streak.js')
const { getLeaderboard, getWeeklyReviewsLeaderboard, getStreaksLeaderboard } = require('../controllers/Leaderboard.js')

// review history, the score-progress graph and the PDF export live here sir

// NOTE: /reviews/progress must be registered BEFORE /reviews/:reviewId sir,
// otherwise express matches "progress" as a reviewId
route.get('/reviews', Auth, getReviews)
route.get('/reviews/progress', Auth, getProgress)
route.get('/reviews/:reviewId', Auth, getReview)
route.get('/reviews/:reviewId/pdf', Auth, downloadReviewPdf)
route.post('/reviews/:reviewId/share', Auth, toggleShare)
route.patch('/reviews/:reviewId/share-audience', Auth, updateShareAudience)

// public share card sir — NO Auth, this is the whole point, must stay behind shareId + isPublic only
route.get('/public/reviews/:shareId', getPublicReview)

// activity streak for the dashboard badge sir
route.get('/streak', Auth, getStreak)

// anonymized leaderboards sir — three boards, same anonymization pattern
route.get('/leaderboard', Auth, getLeaderboard)
route.get('/leaderboard/weekly-reviews', Auth, getWeeklyReviewsLeaderboard)
route.get('/leaderboard/streaks', Auth, getStreaksLeaderboard)

module.exports = route
