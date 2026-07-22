const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} = require('../controllers/Notification.js')

// the bell icon dropdown lives here sir
route.get('/notifications', Auth, getNotifications)
route.get('/notifications/unread-count', Auth, getUnreadCount)
route.patch('/notifications/read-all', Auth, markAllAsRead)
route.patch('/notifications/:notificationId/read', Auth, markAsRead)

module.exports = route
