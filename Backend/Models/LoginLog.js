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

module.exports = mongoose.model('LoginLog', loginLogSchema)
