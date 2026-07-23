const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport } = require('../Middlewares/Auth.js')
const { adminWriteLimiter, adminReadLimiter } = require('../Middlewares/RateLimit.js')
const {
    getDashboardStats,
    getUsers,
    getUserDetail,
    updateUserRole,
    updateUserPlan,
    deleteUser,
    banUser,
    adjustCredits,
    impersonateUser,
    getUserReviews,
    getUserChats,
    getChatDetail
} = require('../controllers/Admin.js')
const {
    getPayments,
    getAiStats,
    getHealth,
    getInsights,
    getAuditLogs,
    getTraffic,
    getDeletions
} = require('../controllers/AdminSystem.js')
const {
    createAnnouncement,
    getAnnouncements,
    toggleAnnouncement,
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
route.patch('/admin/users/:userId/credits', Auth, isSupport, adminWriteLimiter, adjustCredits)
route.get('/admin/payments', Auth, isSupport, adminReadLimiter, getPayments)
route.get('/admin/ai', Auth, isSupport, adminReadLimiter, getAiStats)
route.get('/admin/health', Auth, isSupport, adminReadLimiter, getHealth)
route.get('/admin/insights', Auth, isSupport, adminReadLimiter, getInsights)
route.get('/admin/traffic', Auth, isSupport, adminReadLimiter, getTraffic)
route.get('/admin/deletions', Auth, isSupport, adminReadLimiter, getDeletions)
route.get('/admin/announcements', Auth, isSupport, adminReadLimiter, getAnnouncements)

// ---------- admin-only sir ----------
route.patch('/admin/users/:userId/role', Auth, isAdmin, adminWriteLimiter, updateUserRole)
route.patch('/admin/users/:userId/plan', Auth, isAdmin, adminWriteLimiter, updateUserPlan)
route.patch('/admin/users/:userId/ban', Auth, isAdmin, adminWriteLimiter, banUser)
route.post('/admin/users/:userId/impersonate', Auth, isAdmin, adminWriteLimiter, impersonateUser)
route.delete('/admin/users/:userId', Auth, isAdmin, adminWriteLimiter, deleteUser)
route.get('/admin/audit', Auth, isAdmin, adminReadLimiter, getAuditLogs)
route.get('/admin/settings', Auth, isAdmin, adminReadLimiter, getSettings)
route.patch('/admin/settings/:key', Auth, isAdmin, adminWriteLimiter, upsertSetting)
route.post('/admin/announcements', Auth, isAdmin, adminWriteLimiter, createAnnouncement)
route.patch('/admin/announcements/:announcementId', Auth, isAdmin, adminWriteLimiter, toggleAnnouncement)
route.delete('/admin/announcements/:announcementId', Auth, isAdmin, adminWriteLimiter, deleteAnnouncement)

// ---------- public sir — the frontend banner for every visitor, no login needed ----------
route.get('/announcements/active', getActiveAnnouncement)

module.exports = route
