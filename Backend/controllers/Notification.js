const mongoose = require('mongoose')
const logger = require('../utils/logger')
const Notification = require('../Models/Notification')
const PushSubscription = require('../Models/PushSubscription')
const { isPushConfigured } = require('../utils/WebPush')

// GET /notifications — newest-first, capped so the bell dropdown never loads unbounded history sir
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.User.id

        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(30)

        const unreadCount = await Notification.countDocuments({ user: userId, read: false })

        return res.status(200).json({
            success: true,
            notifications,
            unreadCount,
        })
    } catch (error) {
        (req.log || logger).error('get notifications failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your notifications',
        })
    }
}

// GET /notifications/unread-count — cheap poll target sir, the bell badge can hit this
// without pulling the full list every time
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.User.id
        const unreadCount = await Notification.countDocuments({ user: userId, read: false })

        return res.status(200).json({
            success: true,
            unreadCount,
        })
    } catch (error) {
        (req.log || logger).error('get unread count failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your unread count',
        })
    }
}

// PATCH /notifications/:notificationId/read — mark one as read sir, scoped to the owner
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.User.id
        const { notificationId } = req.params

        if (!mongoose.isValidObjectId(notificationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid notification id',
            })
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { read: true },
            { returnDocument: 'after' }
        )

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            })
        }

        return res.status(200).json({
            success: true,
            notification,
        })
    } catch (error) {
        (req.log || logger).error('mark as read failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the notification',
        })
    }
}

// PATCH /notifications/read-all — the bell dropdown's "mark all read" action sir
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.User.id

        await Notification.updateMany({ user: userId, read: false }, { read: true })

        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        })
    } catch (error) {
        (req.log || logger).error('mark all as read failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating your notifications',
        })
    }
}

// GET /notifications/push/public-key sir — the frontend needs this to call
// PushManager.subscribe({ applicationServerKey: <this key> }); genuinely public by design (it's
// the whole point of the public half of a VAPID key pair), no Auth needed
exports.getPushPublicKey = async (req, res) => {
    if (!isPushConfigured()) {
        return res.status(503).json({ success: false, message: 'Push notifications are not configured on this server' })
    }
    return res.status(200).json({ success: true, publicKey: process.env.WEB_PUSH_PUBLIC_KEY })
}

// POST /notifications/push/subscribe sir — called right after the browser grants permission and
// PushManager.subscribe() resolves. Upserts on endpoint (the same physical subscription re-sent,
// e.g. after a token refresh some browsers do periodically, updates in place rather than
// duplicating) — see Models/PushSubscription.js's own comment on why this isn't just a User field.
exports.subscribeToPush = async (req, res) => {
    try {
        const userId = req.User.id
        const { endpoint, keys, userAgent } = req.body

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ success: false, message: 'Invalid push subscription' })
        }

        await PushSubscription.findOneAndUpdate(
            { endpoint },
            { user: userId, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, userAgent: userAgent || '' },
            { upsert: true }
        )

        return res.status(200).json({ success: true, message: 'Push notifications enabled on this device' })
    } catch (error) {
        (req.log || logger).error('push subscribe failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while enabling push notifications',
        })
    }
}

// POST /notifications/push/unsubscribe sir — called when the user turns push off in-app, or
// right before the frontend calls the browser's own subscription.unsubscribe(). Scoped to the
// endpoint + owning user so one device can't remove another user's subscription by guessing an id.
exports.unsubscribeFromPush = async (req, res) => {
    try {
        const userId = req.User.id
        const { endpoint } = req.body

        if (!endpoint) {
            return res.status(400).json({ success: false, message: 'endpoint is required' })
        }

        await PushSubscription.deleteOne({ endpoint, user: userId })

        return res.status(200).json({ success: true, message: 'Push notifications turned off on this device' })
    } catch (error) {
        (req.log || logger).error('push unsubscribe failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while turning off push notifications',
        })
    }
}
