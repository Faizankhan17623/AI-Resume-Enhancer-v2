const express = require('express')
const route = express.Router()
const {Auth, isUser} = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { createOrderSchema, verifyPaymentSchema } = require('../Validation/schemas.js')
const {
    getPlans,
    createOrder,
    verifyPayment,
    getPaymentHistory
} = require('../controllers/Payment.js')

// everything about money lives here sir. isUser blocks Admin/Support too — buying/holding
// a subscription plan is a User-only concept, an Admin/Support account has none

route.get('/payment/plans',getPlans)
// the plan KEY is validated against the known plans sir — the price is always looked up
// server-side from utils/Plans.js and never read from the request
route.post('/payment/create-order',Auth,isUser,validate({ body: createOrderSchema }),createOrder)
route.post('/payment/verify',Auth,isUser,validate({ body: verifyPaymentSchema }),verifyPayment)
route.get('/payment/history',Auth,isUser,getPaymentHistory)

module.exports = route
