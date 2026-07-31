const mongoose = require('mongoose')

// short-lived, single-use OAuth exchange codes sir — shared Mongo store (not an in-memory Map)
// so the code Google/Facebook/GitHub/LinkedIn callback mints on one Render instance can be
// redeemed by a request that lands on a different instance (horizontal scaling / rolling deploy).
// TTL index sweeps abandoned (never-redeemed) codes automatically instead of leaking forever.
const oauthExchangeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
})

// expireAfterSeconds:0 sir — Mongo deletes the document once expiresAt itself is in the past
oauthExchangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('OAuthExchange', oauthExchangeSchema)
