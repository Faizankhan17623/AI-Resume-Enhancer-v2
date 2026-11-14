const express = require('express')
const route = express.Router()
const { Auth, isSupport, isAdmin } = require('../Middlewares/Auth.js')
const { adminWriteLimiter, adminReadLimiter, authedWriteLimiter } = require('../Middlewares/RateLimit.js')
const { validate } = require('../Middlewares/Validate.js')
const { submitReportSchema, updateReportStatusSchema } = require('../Validation/schemas.js')
const {
    submitReport,
    getMyReports,
    getReports,
    updateReportStatus,
    deleteReport,
} = require('../controllers/Report.js')

// user-facing sir — any logged-in role can report a bug or suggest a feature,
// not gated to isUser since Admin/Support can hit bugs too
route.post('/reports', Auth, authedWriteLimiter, validate({ body: submitReportSchema }), submitReport)
route.get('/reports/mine', Auth, getMyReports)

// triage sir — Support can view/update, only Admin can delete
route.get('/admin/reports', Auth, isSupport, adminReadLimiter, getReports)
route.patch('/admin/reports/:reportId', Auth, isSupport, adminWriteLimiter, validate({ body: updateReportStatusSchema }), updateReportStatus)
route.delete('/admin/reports/:reportId', Auth, isAdmin, adminWriteLimiter, deleteReport)

module.exports = route
