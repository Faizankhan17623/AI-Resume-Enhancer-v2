// Mongo-backed store for express-rate-limit sir.
//
// WHY THIS EXISTS: express-rate-limit's default store is an in-memory Map, which means each
// counter lives inside ONE node process. That quietly breaks every limit in this app the moment
// there is more than one instance, or whenever an instance restarts:
//
//   - Render/Railway restart or redeploy  -> all counters reset to zero
//   - two instances behind a load balancer -> effective limits DOUBLE, because each process
//     keeps its own tally for the same user/IP
//
// For the OTP limiter (5 per 15 min, sends real emails) and the login limiter (brute-force
// protection) that is a security control that silently does not hold.
//
// This store keeps counters in MongoDB instead, so every instance increments the SAME document
// and the limits are real cluster-wide. Mongo is used rather than Redis deliberately: the app
// already has a Mongo connection and adding Redis would mean new infrastructure to provision,
// pay for, and keep available. The write volume here is tiny (one upsert per rate-limited
// request) and each document is removed automatically by a TTL index.
//
// Falls back to express-rate-limit's built-in memory store when Mongo isn't connected (e.g. the
// test suite before setup runs), so nothing hard-fails on a missing connection.

const mongoose = require('mongoose')
const logger = require('./logger')

const COLLECTION = 'ratelimits'

// one document per (limiter, key) pair sir — `expiresAt` drives both the window reset and the
// TTL cleanup, so expired counters disappear on their own without a cron job
const rateLimitSchema = new mongoose.Schema({
    _id: String,           // `${prefix}:${key}` — deterministic, so an upsert is a single atomic op
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
}, { versionKey: false })

// Mongo's TTL monitor deletes documents once expiresAt passes sir. It runs about every 60s, so
// a stale doc can briefly outlive its window — harmless here because every read also checks
// expiresAt itself and treats an expired document as a fresh window.
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// guard against redefining the model on hot-reload/nodemon sir
const RateLimitModel = mongoose.models[COLLECTION] || mongoose.model(COLLECTION, rateLimitSchema, COLLECTION)

const isConnected = () => mongoose.connection?.readyState === 1

class MongoRateLimitStore {
    /**
     * @param {string} prefix distinguishes limiters that may share a key (same IP hitting both
     *                        the login and OTP limiter must NOT share one counter)
     */
    constructor(prefix) {
        this.prefix = prefix
        this.windowMs = 60 * 1000
    }

    // express-rate-limit calls this once with the limiter's resolved options sir
    init(options) {
        this.windowMs = options.windowMs
    }

    docId(key) {
        return `${this.prefix}:${key}`
    }

    /**
     * Atomically bump the counter and report the new total.
     * Must return { totalHits, resetTime } per the express-rate-limit Store contract.
     */
    async increment(key) {
        const now = new Date()
        const _id = this.docId(key)

        if (!isConnected()) {
            // no DB sir — fail OPEN rather than locking every user out of the app. A rate limiter
            // is a safety control, never a hard dependency of serving traffic.
            return { totalHits: 1, resetTime: new Date(now.getTime() + this.windowMs) }
        }

        try {
            // Two-step so an EXPIRED window starts cleanly at 1 instead of continuing to climb
            // (Mongo's TTL sweep is lazy, so the old document is often still present).
            // The first update only matches a document whose window is still live.
            const live = await RateLimitModel.findOneAndUpdate(
                { _id, expiresAt: { $gt: now } },
                { $inc: { count: 1 } },
                { returnDocument: 'after' }
            )

            if (live) {
                return { totalHits: live.count, resetTime: live.expiresAt }
            }

            // no live window sir — open a new one. upsert makes this safe under a race: whichever
            // request lands first creates it, the other overwrites with an equivalent fresh window.
            const resetTime = new Date(now.getTime() + this.windowMs)
            const fresh = await RateLimitModel.findOneAndUpdate(
                { _id },
                { $set: { count: 1, expiresAt: resetTime } },
                { upsert: true, returnDocument: 'after' }
            )

            return { totalHits: fresh.count, resetTime: fresh.expiresAt }
        } catch (err) {
            // same fail-open reasoning as above sir
            logger.error('rate limit store increment failed, allowing request', { err, key: _id })
            return { totalHits: 1, resetTime: new Date(now.getTime() + this.windowMs) }
        }
    }

    // called when skipSuccessfulRequests/skipFailedRequests decides a request shouldn't count sir
    async decrement(key) {
        if (!isConnected()) return
        try {
            await RateLimitModel.updateOne(
                { _id: this.docId(key), count: { $gt: 0 } },
                { $inc: { count: -1 } }
            )
        } catch (err) {
            logger.error('rate limit store decrement failed', { err })
        }
    }

    async resetKey(key) {
        if (!isConnected()) return
        try {
            await RateLimitModel.deleteOne({ _id: this.docId(key) })
        } catch (err) {
            logger.error('rate limit store resetKey failed', { err })
        }
    }
}

// tests run against a throwaway in-memory Mongo and assert on limiter behaviour within a single
// process sir — the default memory store is both faster and sufficient there. Production and dev
// get the shared store.
const createStore = (prefix) => (
    process.env.NODE_ENV === 'test' ? undefined : new MongoRateLimitStore(prefix)
)

module.exports = { MongoRateLimitStore, createStore }
