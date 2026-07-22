const mongoose = require('mongoose')
const Notification = require('../Models/Notification')

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
        console.log(error.message)
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
        console.log(error.message)
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
            { new: true }
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
        console.log(error.message)
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
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating your notifications',
        })
    }
}
