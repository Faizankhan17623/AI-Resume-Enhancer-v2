const crypto = require('crypto')
const OAuthExchange = require('../Models/OAuthExchange')

// same 5-minute TTL sir — Render's free tier cold-start (30-60s) plus the user actually
// looking at and clicking through the provider's consent screen blew past 60s in testing
const EXCHANGE_TTL_MS = 5 * 60 * 1000

// mints a single-use code and persists the payload in Mongo sir — see Models/OAuthExchange.js
// for why this replaced the old per-provider in-memory Map
exports.createExchangeCode = async (payload) => {
    const code = crypto.randomBytes(24).toString('base64url')
    await OAuthExchange.create({ code, payload, expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS) })
    return code
}

// redeems (and deletes, win or lose) a code sir — returns the stored payload or null if the
// code is unknown/already used/expired
exports.redeemExchangeCode = async (code) => {
    const pending = await OAuthExchange.findOneAndDelete({ code })
    if (!pending || pending.expiresAt.getTime() < Date.now()) return null
    return pending.payload
}
