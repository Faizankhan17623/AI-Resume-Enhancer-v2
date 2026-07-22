const mongoose = require('mongoose')

// one in-app notification sir — the bell icon's dropdown reads these, the type mirrors the
// same events the email nudges already cover (streak/win-back/digest/health-check), plus
// generic ones (e.g. admin announcements) can reuse 'system'
const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['streak-break', 'win-back', 'digest', 'health-check', 'system'],
            default: 'system',
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            trim: true,
        },
        // where clicking the notification should take the user sir, e.g. /Dashboard/History
        link: {
            type: String,
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

// the bell dropdown reads newest-first, and the unread-count badge filters on {user, read:false} sir
notificationSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
