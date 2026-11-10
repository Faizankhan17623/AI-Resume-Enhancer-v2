const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { subscribeToPushSchema, unsubscribeFromPushSchema } = require('../Validation/schemas.js')
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
route.post('/notifications/push/subscribe', Auth, validate({ body: subscribeToPushSchema }), subscribeToPush)
route.post('/notifications/push/unsubscribe', Auth, validate({ body: unsubscribeFromPushSchema }), unsubscribeFromPush)

module.exports = route
