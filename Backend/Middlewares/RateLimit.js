const rateLimit = require('express-rate-limit')

// all the rate limiters live here sir — tune the numbers ONLY here
// every limiter sends the standard RateLimit headers so the frontend can show "try again in X"

// a common 429 reply shape matching the rest of our API sir
const tooMany = (message) => ({
    success: false,
    message,
})

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

// AI routes burn Groq tokens and credits sir — 10 calls per minute per IP is plenty for a human
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('You are sending requests too fast, please wait a minute and try again'),
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
