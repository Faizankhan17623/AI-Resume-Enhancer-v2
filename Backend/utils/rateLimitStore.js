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
// BEHAVIOUR WHEN MONGO IS UNAVAILABLE is a per-limiter POLICY decision, not one global rule:
//
//   failMode 'open'   -> a store outage lets the request through. Correct for the generous
//                        traffic-shaping limiters (global, admin, visitor): a rate limiter must
//                        never be the reason the whole product goes down.
//   failMode 'closed' -> a store outage counts the request against a small in-process budget and
//                        then rejects. Correct for the SECURITY limiters (login, OTP, password
//                        reset): failing open there means a Mongo blip silently disables
//                        brute-force protection and lets OTP email sending run unbounded, which
//                        is precisely the window an attacker wants.
//
// Fail-closed is deliberately NOT a hard reject: a per-process fallback counter still allows a
// small number of attempts per window so a brief blip doesn't lock every legitimate user out of
// logging in entirely. It degrades the limit, it does not remove or absolutise it.

const mongoose = require('mongoose')
const logger = require('./logger')

const COLLECTION = 'ratelimits'

// how many requests a fail-CLOSED limiter still allows per window, per process, while the store
// is unreachable sir. Small enough that brute-force is still throttled, large enough that a real
// user retrying a login during an outage isn't locked out.
const DEGRADED_ALLOWANCE = 3

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
     * @param {'open'|'closed'} failMode what to do when Mongo is unreachable (see header)
     */
    constructor(prefix, failMode = 'open') {
        this.prefix = prefix
        this.windowMs = 60 * 1000
        this.failMode = failMode
        // per-process fallback counters, used ONLY while the store is unreachable sir
        this.degraded = new Map() // key -> { count, resetAt }
    }

    // express-rate-limit calls this once with the limiter's resolved options sir
    init(options) {
        this.windowMs = options.windowMs
    }

    docId(key) {
        return `${this.prefix}:${key}`
    }

    /**
     * The response used when Mongo can't be reached sir.
     *
     * fail-open reports a single hit, so the limiter never trips.
     * fail-closed counts in-process against DEGRADED_ALLOWANCE, so the limiter still trips —
     * express-rate-limit compares totalHits against the limiter's own `max`, so returning a
     * number above that max is what produces the 429.
     */
    degradedResult(key, now) {
        const resetTime = new Date(now.getTime() + this.windowMs)

        if (this.failMode !== 'closed') {
            return { totalHits: 1, resetTime }
        }

        const entry = this.degraded.get(key)
        if (!entry || entry.resetAt <= now.getTime()) {
            this.degraded.set(key, { count: 1, resetAt: resetTime.getTime() })
            return { totalHits: 1, resetTime }
        }

        entry.count += 1
        // once the degraded budget is spent sir, report a deliberately huge hit count so the
        // limiter rejects regardless of which `max` this particular limiter was configured with
        const totalHits = entry.count > DEGRADED_ALLOWANCE ? Number.MAX_SAFE_INTEGER : entry.count
        return { totalHits, resetTime: new Date(entry.resetAt) }
    }

    /**
     * Atomically bump the counter and report the new total.
     * Must return { totalHits, resetTime } per the express-rate-limit Store contract.
     */
    async increment(key) {
        const now = new Date()
        const _id = this.docId(key)

        if (!isConnected()) {
            // policy decides sir — see the header. Security limiters degrade rather than vanish.
            return this.degradedResult(key, now)
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
            logger.error('rate limit store increment failed, applying degraded policy', {
                err,
                key: _id,
                failMode: this.failMode,
            })
            return this.degradedResult(key, now)
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
const createStore = (prefix, failMode = 'open') => (
    process.env.NODE_ENV === 'test' ? undefined : new MongoRateLimitStore(prefix, failMode)
)

module.exports = { MongoRateLimitStore, createStore, DEGRADED_ALLOWANCE }
