const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport } = require('../Middlewares/Auth.js')
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
    getAuditLogs
} = require('../controllers/AdminSystem.js')
const {
    createAnnouncement,
    getAnnouncements,
    toggleAnnouncement,
    deleteAnnouncement,
    getActiveAnnouncement
} = require('../controllers/Announcement.js')

// the admin dashboard lives here sir — RBAC in two levels:
//   isSupport → Support AND Admin pass (view, inspect, help users)
//   isAdmin   → Admin only (promote, ban, delete, money-adjacent writes)
// Auth always runs first and checks the role FRESH from the DB, so demotions apply instantly

// ---------- support-level (Support + Admin) sir ----------
route.get('/admin/stats', Auth, isSupport, getDashboardStats)
route.get('/admin/users', Auth, isSupport, getUsers)
route.get('/admin/users/:userId', Auth, isSupport, getUserDetail)
route.get('/admin/users/:userId/reviews', Auth, isSupport, getUserReviews)
route.get('/admin/users/:userId/chats', Auth, isSupport, getUserChats)
route.get('/admin/chats/:chatId', Auth, isSupport, getChatDetail)
route.patch('/admin/users/:userId/credits', Auth, isSupport, adjustCredits)
route.get('/admin/payments', Auth, isSupport, getPayments)
route.get('/admin/ai', Auth, isSupport, getAiStats)
route.get('/admin/health', Auth, isSupport, getHealth)
route.get('/admin/insights', Auth, isSupport, getInsights)
route.get('/admin/announcements', Auth, isSupport, getAnnouncements)

// ---------- admin-only sir ----------
route.patch('/admin/users/:userId/role', Auth, isAdmin, updateUserRole)
route.patch('/admin/users/:userId/plan', Auth, isAdmin, updateUserPlan)
route.patch('/admin/users/:userId/ban', Auth, isAdmin, banUser)
route.post('/admin/users/:userId/impersonate', Auth, isAdmin, impersonateUser)
route.delete('/admin/users/:userId', Auth, isAdmin, deleteUser)
route.get('/admin/audit', Auth, isAdmin, getAuditLogs)
route.post('/admin/announcements', Auth, isAdmin, createAnnouncement)
route.patch('/admin/announcements/:announcementId', Auth, isAdmin, toggleAnnouncement)
route.delete('/admin/announcements/:announcementId', Auth, isAdmin, deleteAnnouncement)

// ---------- public sir — the frontend banner for every visitor, no login needed ----------
route.get('/announcements/active', getActiveAnnouncement)

module.exports = route
