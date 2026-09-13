const mongoose = require('mongoose')

// single-use confirm/deny tokens for the new-device login alert email sir — same shape as
// Models/OAuthExchange.js (a shared Mongo store rather than an in-memory Map, so a token minted
// on one instance can still be redeemed by a request that lands on another; TTL index sweeps
// abandoned/expired tokens automatically). Kept separate from User.resetPasswordToken on purpose:
// this token answers a different question ("was this login you?") than a real password reset
// token does, and conflating the two fields would let one flow's token accidentally satisfy the
// other's check.
const deviceAlertTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    deviceHash: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
})

// expireAfterSeconds:0 sir — Mongo deletes the document once expiresAt is in the past, same
// pattern as OAuthExchange
deviceAlertTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('DeviceAlertToken', deviceAlertTokenSchema)
