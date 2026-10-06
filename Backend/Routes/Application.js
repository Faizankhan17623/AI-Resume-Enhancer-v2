const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    createApplication,
    getApplications,
    updateApplication,
    deleteApplication,
    getApplicationAnalytics,
    diagnoseRejection,
    getRejectionPatterns
} = require('../controllers/Application.js')

// the job application tracker sir — a plain Kanban board, no AI call anywhere in most of this
// file, so no dedicated limiter needed beyond the app-wide globalLimiter. diagnoseRejection is
// the one exception (it spends a real AI credit, see services/rejectionDiagnosisService.js), so
// that one route alone gets aiLimiter.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

// /analytics and /rejection-patterns must come before the /:applicationId routes sir, otherwise
// Express reads "analytics"/"rejection-patterns" as an applicationId and 400s on the
// isValidObjectId check
route.get('/applications/analytics', Auth, isUser, getApplicationAnalytics)
route.get('/applications/rejection-patterns', Auth, isUser, getRejectionPatterns)
route.post('/applications', Auth, isUser, createApplication)
route.get('/applications', Auth, isUser, getApplications)
route.patch('/applications/:applicationId', Auth, isUser, updateApplication)
route.delete('/applications/:applicationId', Auth, isUser, deleteApplication)
route.post('/applications/:applicationId/diagnose', aiLimiter, Auth, isUser, diagnoseRejection)

module.exports = route
