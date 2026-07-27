const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const { getUserPlan } = require('../utils/Plans')

// all the rate limiters live here sir — tune the numbers ONLY here
// every limiter sends the standard RateLimit headers so the frontend can show "try again in X"

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
        const token =
            req.cookies?.token ||
            req.body?.token ||
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
})

// login/signup brute-force protection sir — 20 tries per 15 min per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many login attempts, please try again after 15 minutes'),
})

// OTP is the most abusable route (it sends real emails) sir — keep this one tight
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many OTP requests, please try again after 15 minutes'),
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
        const token =
            req.cookies?.token ||
            req.body?.token ||
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
})

// admin write actions are already Auth + role-gated sir — this is defense in depth in case a
// token is ever stolen/replayed, so a script can't rapid-fire bans/role-changes/deletions
const adminWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many admin actions in a short time, please slow down'),
})

// admin read/dashboard routes sir — also Auth + role-gated already, same defense-in-depth
// reasoning as adminWriteLimiter but looser since a dashboard page fires several GETs on load
const adminReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many admin requests in a short time, please slow down'),
})

// grammar-check parses an uploaded PDF (real CPU/parsing cost) sir even though it's free/no-credit —
// closer to the AI routes' abuse profile than a plain CRUD call, so it gets its own tighter cap
const grammarCheckLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('You are sending requests too fast, please wait a minute and try again'),
})

module.exports = { globalLimiter, authLimiter, otpLimiter, aiLimiter, visitorLimiter, adminWriteLimiter, adminReadLimiter, grammarCheckLimiter }
