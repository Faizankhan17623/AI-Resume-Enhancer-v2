const express = require('express')
const route = express.Router()
const {Auth, isUser} = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { authedWriteLimiter } = require('../Middlewares/RateLimit.js')
const { createOrderSchema, verifyPaymentSchema } = require('../Validation/schemas.js')
const {
    getPlans,
    createOrder,
    verifyPayment,
    getPaymentHistory,
    paymentWebhook
} = require('../controllers/Payment.js')

// everything about money lives here sir. isUser blocks Admin/Support too — buying/holding
// a subscription plan is a User-only concept, an Admin/Support account has none

route.get('/payment/plans',getPlans)
// authedWriteLimiter sir, per 2026-11-15 audit — these had no DEDICATED limiter beyond the
// loose app-wide globalLimiter, same gap authedWriteLimiter already closed on 22 other routes
// (see Middlewares/RateLimit.js's own comment on why that matters per-route, not just app-wide)
//
// the plan KEY is validated against the known plans sir — the price is always looked up
// server-side from utils/Plans.js and never read from the request
route.post('/payment/create-order',Auth,isUser,authedWriteLimiter,validate({ body: createOrderSchema }),createOrder)
route.post('/payment/verify',Auth,isUser,authedWriteLimiter,validate({ body: verifyPaymentSchema }),verifyPayment)
route.get('/payment/history',Auth,isUser,authedWriteLimiter,getPaymentHistory)

// server-to-server from Razorpay sir — no Auth/isUser, Razorpay is not a logged-in user, and
// deliberately NO validate() either: req.body here is the raw Buffer the signature is computed
// over, and parsing it would destroy exactly the bytes the HMAC check needs.
// Trust here comes entirely from the HMAC signature check inside paymentWebhook, not from
// a session. NOTE: this route needs express.raw() body parsing (the raw bytes Razorpay
// signed), which is wired up in index.js BEFORE the global express.json() — see there.
route.post('/payment/webhook', paymentWebhook)

module.exports = route
