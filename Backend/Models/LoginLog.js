const mongoose = require('mongoose')

// one row per successful login sir — powers the admin traffic dashboard's login trend
// written fire-and-forget from loginUser so a logging failure never blocks a real login
const loginLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        ip: {
            type: String,
        },
        userAgent: {
            type: String,
        },
    },
    { timestamps: true }
)

// the dashboard mostly asks "how many logins in this window" sir
loginLogSchema.index({ createdAt: -1 })

// TTL sir, per 2026-11-08 audit — same reasoning as AiLog.js, nothing read this past 30 days
// but nothing ever deleted old rows either. 90 days headroom, Mongo handles deletion itself.
loginLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

module.exports = mongoose.model('LoginLog', loginLogSchema)
