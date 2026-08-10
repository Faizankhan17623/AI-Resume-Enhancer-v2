const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const { getUserPlan } = require('../utils/Plans')
const { createStore } = require('../utils/rateLimitStore')

// all the rate limiters live here sir — tune the numbers ONLY here
// every limiter sends the standard RateLimit headers so the frontend can show "try again in X"
//
// EVERY limiter passes an explicit `store` sir. express-rate-limit's default store is a
// per-process Map, which means each counter lives inside ONE node process: a redeploy resets
// every counter, and two instances behind a load balancer each keep their own tally so the
// effective limit DOUBLES. For the OTP limiter (sends real emails) and the login limiter
// (brute-force protection) that is a security control that silently does not hold.
// See utils/rateLimitStore.js — it also documents the fail-open vs fail-closed policy below.
//
// The second argument is that policy: 'closed' for the security-critical limiters, 'open' for the
// generous traffic-shaping ones that must never take the product down.

// a common 429 reply shape matching the rest of our API sir
const tooMany = (message) => ({
    success: false,
    message,
})

// per-plan AI request ceiling sir — paying tiers get a higher per-minute allowance.
// ProMax's 30/min matches Groq's own free-tier RPM cap, so a ProMax user is gated by Groq
// itself before ever hitting our own limiter.
const AI_LIMIT_BY_PLAN = { Basic: 10, Pro: 20, ProMax: 30 }

// resolves the caller's plan straight from the JWT + a fresh DB read sir, WITHOUT depending on
// the Auth middleware having already run — some routes put aiLimiter before Auth, some after
// (see Routes/*.js), so this has to work standalone either way. Any failure (no token, bad
// token, user not found) quietly falls back to Basic's limit — a rate limiter must never be the
// thing that breaks a request; Auth (which runs on every one of these routes regardless of
// order) is what actually rejects bad auth, not this.
const resolveAiPlanKey = async (req) => {
    try {
        // cookie first, then the Authorization header sir — NOT req.body.token. Auth.js's own
        // extractToken deliberately dropped body-token as a source (a JSON-body credential widens
        // CSRF exposure and leaks into logs, and nothing in the frontend ever sends it that way);
        // reading it here for rate-limit bucketing alone would quietly reopen that exact exposure.
        const token =
            req.cookies?.token ||
            req.header('Authorization')?.replace('Bearer ', '')
        if (!token) return 'Basic'

        const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY)
        if (!decoded?.id) return 'Basic'

        const plan = await getUserPlan(decoded.id)
        return plan?.key || 'Basic'
    } catch {
        return 'Basic'
    }
}

// global safety net sir — generous, only stops floods/scrapers, never a real user
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many requests, please slow down and try again in a few minutes'),
    // fail OPEN sir — this one exists to stop floods, not to protect a secret. If the store is
    // down, serving traffic matters more than shaping it.
    store: createStore('global', 'open'),
})

// login/signup brute-force protection sir — 20 tries per 15 min per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many login attempts, please try again after 15 minutes'),
    // fail CLOSED sir — this is the brute-force control. A store outage must not become an
    // unlimited password-guessing window.
    store: createStore('auth', 'closed'),
})

// OTP is the most abusable route (it sends real emails) sir — keep this one tight
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many OTP requests, please try again after 15 minutes'),
    // fail CLOSED sir — every request here spends real money on a real email.
    store: createStore('otp', 'closed'),
})

// AI routes burn Groq tokens and credits sir — plan-aware ceiling per minute: Basic 10, Pro 20,
// ProMax 30 (matches Groq's own free-tier RPM cap, so ProMax is gated by Groq itself first).
// Keyed by userId (falling back to IP if we truly can't resolve one) instead of plain IP so two
// different users behind the same IP/NAT never share one bucket, and so the SAME user's limit
// stays consistent across requests regardless of which IP they're on.
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('You are sending requests too fast, please wait a minute and try again'),
    keyGenerator: async (req, res) => {
        const plan = await resolveAiPlanKey(req)
        // stash the resolved plan sir so `max` below doesn't re-decode the same token/DB call twice
        res.locals.aiPlanKey = plan
        // same source order as resolveAiPlanKey above sir — no req.body.token, see the comment there
        const token =
            req.cookies?.token ||
            req.header('Authorization')?.replace('Bearer ', '')
        // ipKeyGenerator(req.ip) (not raw req.ip alone) sir — express-rate-limit requires it for
        // the IPv6 fallback path, otherwise it throws ERR_ERL_KEY_GEN_IPV6 (varying IPv6 suffixes
        // could otherwise dodge the bucket entirely). Takes the IP STRING, not the req object.
        if (!token) return ipKeyGenerator(req.ip)
        try {
            const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY)
            return decoded?.id ? String(decoded.id) : ipKeyGenerator(req.ip)
        } catch {
            return ipKeyGenerator(req.ip)
        }
    },
    max: (req, res) => AI_LIMIT_BY_PLAN[res.locals.aiPlanKey] || AI_LIMIT_BY_PLAN.Basic,
    // fail CLOSED sir — every request past this point burns Groq tokens and a user's paid credit.
    store: createStore('ai', 'closed'),
})

// track-visit is public and unauthenticated sir — a real browser only ever calls it once
// (the frontend gates it behind a localStorage flag), so anything past a handful of hits per IP
// is either a broken client retrying or someone trying to flood the VisitorLog collection
const visitorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many requests, please try again later'),
    store: createStore('visitor', 'open'),
})

// admin write actions are already Auth + role-gated sir — this is defense in depth in case a
// token is ever stolen/replayed, so a script can't rapid-fire bans/role-changes/deletions
const adminWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many admin actions in a short time, please slow down'),
    // fail OPEN sir — already Auth + role-gated, and locking admins out during an incident is
    // exactly the wrong behaviour when they're the ones who need to fix it.
    store: createStore('admin-write', 'open'),
})

// admin read/dashboard routes sir — also Auth + role-gated already, same defense-in-depth
// reasoning as adminWriteLimiter but looser since a dashboard page fires several GETs on load
const adminReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many admin requests in a short time, please slow down'),
    store: createStore('admin-read', 'open'),
})

// grammar-check parses an uploaded PDF (real CPU/parsing cost) sir even though it's free/no-credit —
// closer to the AI routes' abuse profile than a plain CRUD call, so it gets its own tighter cap
const grammarCheckLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('You are sending requests too fast, please wait a minute and try again'),
    // fail CLOSED sir — real CPU cost per request (PDF parsing) on a constrained dyno.
    store: createStore('grammar-check', 'closed'),
})

// testimonial text ends up in a moderation queue and (once approved) on the public homepage sir —
// tighter than the global default even though the one-pending-submission-per-user guard in the
// controller already blocks rapid resubmission; this just makes the limit explicit
const testimonialLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many testimonial submissions, please try again later'),
    // fail CLOSED sir — this content reaches the public homepage once approved.
    store: createStore('testimonial', 'closed'),
})

// a candidate's browser posts one violation (with a snapshot image) per look-away event sir —
// a handful per minute is normal, anything more is either a bug in the polling loop or abuse
const violationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many violation reports in a short time, please slow down'),
    // fail CLOSED sir — each request uploads an image to Cloudinary, real cost per call.
    store: createStore('test-violation', 'closed'),
})

module.exports = { globalLimiter, authLimiter, otpLimiter, aiLimiter, visitorLimiter, adminWriteLimiter, adminReadLimiter, grammarCheckLimiter, testimonialLimiter, violationLimiter }
