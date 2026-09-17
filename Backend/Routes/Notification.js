const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    getPushPublicKey,
    subscribeToPush,
    unsubscribeFromPush
} = require('../controllers/Notification.js')

// the bell icon dropdown lives here sir
route.get('/notifications', Auth, getNotifications)
route.get('/notifications/unread-count', Auth, getUnreadCount)
route.patch('/notifications/read-all', Auth, markAllAsRead)
route.patch('/notifications/:notificationId/read', Auth, markAsRead)

// real Web Push sir, per direct request — public-key is genuinely public (no Auth), the
// subscribe/unsubscribe pair is per-logged-in-user
route.get('/notifications/push/public-key', getPushPublicKey)
route.post('/notifications/push/subscribe', Auth, subscribeToPush)
route.post('/notifications/push/unsubscribe', Auth, unsubscribeFromPush)

module.exports = route
