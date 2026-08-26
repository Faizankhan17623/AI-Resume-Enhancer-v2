const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport } = require('../Middlewares/Auth.js')
const { adminWriteLimiter, adminReadLimiter } = require('../Middlewares/RateLimit.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    updateUserRoleSchema,
    bulkUpdateRoleSchema,
    banUserSchema,
    bulkBanSchema,
    adjustCreditsSchema,
    grantCreditsToAllSchema,
    updateUserPlanSchema,
    rejectRecruiterApplicationSchema,
} = require('../Validation/schemas.js')
const {
    getDashboardStats,
    getUsers,
    getUserDetail,
    updateUserRole,
    bulkUpdateUserRole,
    updateUserPlan,
    deleteUser,
    banUser,
    bulkBanUsers,
    rejectSupportAppeal,
    adjustCredits,
    grantCreditsToAll,
    impersonateUser,
    getUserReviews,
    getUserChats,
    getChatDetail,
    getRecruiterApplications,
    approveRecruiterApplication,
    rejectRecruiterApplication
} = require('../controllers/Admin.js')
const {
    getPayments,
    getAiStats,
    getAiUsageByUser,
    getAtRiskUsers,
    getReferralAbuseSignals,
    getHealth,
    getInsights,
    getAuditLogs,
    getCreditGrants,
    getTraffic,
    getDeletions,
    getSecurity,
    getGlobalSearch,
    getReconciliation
} = require('../controllers/AdminSystem.js')
const {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
    getActiveAnnouncement
} = require('../controllers/Announcement.js')
const {
    getSettings,
    upsertSetting
} = require('../controllers/AdminSettings.js')

// the admin dashboard lives here sir — RBAC in two levels:
//   isSupport → Support AND Admin pass (view, inspect, help users)
//   isAdmin   → Admin only (promote, ban, delete, money-adjacent writes)
// Auth always runs first and checks the role FRESH from the DB, so demotions apply instantly

// ---------- support-level (Support + Admin) sir ----------
route.get('/admin/stats', Auth, isSupport, adminReadLimiter, getDashboardStats)
route.get('/admin/users', Auth, isSupport, adminReadLimiter, getUsers)
route.get('/admin/users/:userId', Auth, isSupport, adminReadLimiter, getUserDetail)
route.get('/admin/users/:userId/reviews', Auth, isSupport, adminReadLimiter, getUserReviews)
route.get('/admin/users/:userId/chats', Auth, isSupport, adminReadLimiter, getUserChats)
route.get('/admin/chats/:chatId', Auth, isSupport, adminReadLimiter, getChatDetail)
route.patch('/admin/users/:userId/credits', Auth, isSupport, adminWriteLimiter, validate({ body: adjustCreditsSchema }), adjustCredits)
route.get('/admin/payments', Auth, isSupport, adminReadLimiter, getPayments)
route.get('/admin/ai', Auth, isSupport, adminReadLimiter, getAiStats)
route.get('/admin/ai/by-user', Auth, isSupport, adminReadLimiter, getAiUsageByUser)
route.get('/admin/at-risk', Auth, isSupport, adminReadLimiter, getAtRiskUsers)
route.get('/admin/referral-abuse', Auth, isSupport, adminReadLimiter, getReferralAbuseSignals)
route.get('/admin/health', Auth, isSupport, adminReadLimiter, getHealth)
route.get('/admin/insights', Auth, isSupport, adminReadLimiter, getInsights)
route.get('/admin/traffic', Auth, isSupport, adminReadLimiter, getTraffic)
route.get('/admin/deletions', Auth, isSupport, adminReadLimiter, getDeletions)
route.get('/admin/reconciliation', Auth, isSupport, adminReadLimiter, getReconciliation)
route.get('/admin/security', Auth, isSupport, adminReadLimiter, getSecurity)
route.get('/admin/search', Auth, isSupport, adminReadLimiter, getGlobalSearch)
route.get('/admin/announcements', Auth, isSupport, adminReadLimiter, getAnnouncements)

// ---------- admin-only sir ----------
route.patch('/admin/users/bulk-role', Auth, isAdmin, adminWriteLimiter, validate({ body: bulkUpdateRoleSchema }), bulkUpdateUserRole)
route.patch('/admin/users/:userId/role', Auth, isAdmin, adminWriteLimiter, validate({ body: updateUserRoleSchema }), updateUserRole)
// recruiter self-signup approval queue sir — Admin-only, NOT isSupport: promoting someone to
// Recruiter is the same class of judgment call as any other role change above
route.get('/admin/recruiter-applications', Auth, isAdmin, adminReadLimiter, getRecruiterApplications)
route.post('/admin/recruiter-applications/:userId/approve', Auth, isAdmin, adminWriteLimiter, approveRecruiterApplication)
route.post('/admin/recruiter-applications/:userId/reject', Auth, isAdmin, adminWriteLimiter, validate({ body: rejectRecruiterApplicationSchema }), rejectRecruiterApplication)
route.patch('/admin/users/:userId/plan', Auth, isAdmin, adminWriteLimiter, validate({ body: updateUserPlanSchema }), updateUserPlan)
route.patch('/admin/users/bulk-ban', Auth, isAdmin, adminWriteLimiter, validate({ body: bulkBanSchema }), bulkBanUsers)
route.patch('/admin/users/:userId/ban', Auth, isAdmin, adminWriteLimiter, validate({ body: banUserSchema }), banUser)
route.patch('/admin/users/:userId/reject-appeal', Auth, isAdmin, adminWriteLimiter, rejectSupportAppeal)
route.post('/admin/users/:userId/impersonate', Auth, isAdmin, adminWriteLimiter, impersonateUser)
// broadcast bonus credits to every User account sir — Admin-only like every other bulk action
// above, and registered as a literal path so it never collides with the :userId param routes
route.post('/admin/users/grant-credits-all', Auth, isAdmin, adminWriteLimiter, validate({ body: grantCreditsToAllSchema }), grantCreditsToAll)
route.delete('/admin/users/:userId', Auth, isAdmin, adminWriteLimiter, deleteUser)
route.get('/admin/audit', Auth, isAdmin, adminReadLimiter, getAuditLogs)
route.get('/admin/credit-grants', Auth, isAdmin, adminReadLimiter, getCreditGrants)
route.get('/admin/settings', Auth, isAdmin, adminReadLimiter, getSettings)
route.patch('/admin/settings/:key', Auth, isAdmin, adminWriteLimiter, upsertSetting)
route.post('/admin/announcements', Auth, isAdmin, adminWriteLimiter, createAnnouncement)
route.patch('/admin/announcements/:announcementId', Auth, isAdmin, adminWriteLimiter, updateAnnouncement)
route.delete('/admin/announcements/:announcementId', Auth, isAdmin, adminWriteLimiter, deleteAnnouncement)

// ---------- public sir — the frontend banner for every visitor, no login needed ----------
route.get('/announcements/active', getActiveAnnouncement)

module.exports = route