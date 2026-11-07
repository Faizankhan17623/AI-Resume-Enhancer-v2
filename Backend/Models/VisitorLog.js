const mongoose = require('mongoose')

// one row per unique first-time visitor sir — cookieId is a random token the frontend beacon
// sets once per browser, so a returning visitor never creates a second row here
// powers the admin traffic dashboard's "unique visitors" trend, tracked pre-login too
const visitorLogSchema = new mongoose.Schema(
    {
        cookieId: {
            type: String,
            required: true,
            unique: true,
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

// the dashboard mostly asks "how many first-time visits in this window" sir
visitorLogSchema.index({ createdAt: -1 })

// TTL sir, per 2026-11-08 audit — same reasoning as AiLog.js/LoginLog.js. A cookieId that
// returns after 90 days of inactivity just gets treated as a new visitor again, which is fine.
visitorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

module.exports = mongoose.model('VisitorLog', visitorLogSchema)
