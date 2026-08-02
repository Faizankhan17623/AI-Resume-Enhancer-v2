const express = require('express')
const route = express.Router()
const {Auth, isUser} = require('../Middlewares/Auth.js')
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
route.post('/payment/create-order',Auth,isUser,createOrder)
route.post('/payment/verify',Auth,isUser,verifyPayment)
route.get('/payment/history',Auth,isUser,getPaymentHistory)

// server-to-server from Razorpay sir — no Auth/isUser, Razorpay is not a logged-in user.
// Trust here comes entirely from the HMAC signature check inside paymentWebhook, not from
// a session. NOTE: this route needs express.raw() body parsing (the raw bytes Razorpay
// signed), which is wired up in index.js BEFORE the global express.json() — see there.
route.post('/payment/webhook', paymentWebhook)

module.exports = route
