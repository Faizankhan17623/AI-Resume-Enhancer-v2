const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
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

// review history, the score-progress graph and the PDF export live here sir.
// isUser blocks Admin/Support too, these are all product features, strictly User-only —
// EXCEPT the public share card below, which stays exactly as it was (no Auth at all)

// NOTE: /reviews/progress must be registered BEFORE /reviews/:reviewId sir,
// otherwise express matches "progress" as a reviewId
route.get('/reviews', Auth, isUser, getReviews)
route.get('/reviews/progress', Auth, isUser, getProgress)
route.get('/reviews/:reviewId', Auth, isUser, getReview)
route.get('/reviews/:reviewId/pdf', Auth, isUser, downloadReviewPdf)
route.post('/reviews/:reviewId/share', Auth, isUser, toggleShare)
route.patch('/reviews/:reviewId/share-audience', Auth, isUser, updateShareAudience)

// public share card sir — NO Auth, this is the whole point, must stay behind shareId + isPublic only
route.get('/public/reviews/:shareId', getPublicReview)

// activity streak for the dashboard badge sir
route.get('/streak', Auth, isUser, getStreak)

// anonymized leaderboards sir — three boards, same anonymization pattern
route.get('/leaderboard', Auth, isUser, getLeaderboard)
route.get('/leaderboard/weekly-reviews', Auth, isUser, getWeeklyReviewsLeaderboard)
route.get('/leaderboard/streaks', Auth, isUser, getStreaksLeaderboard)

module.exports = route
