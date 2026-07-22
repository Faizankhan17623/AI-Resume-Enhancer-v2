const express = require('express')
const route = express.Router()
const {Auth, isUser} = require('../Middlewares/Auth.js')
const {
    getPlans,
    createOrder,
    verifyPayment,
    getPaymentHistory
} = require('../controllers/Payment.js')

// everything about money lives here sir. isUser blocks Admin/Support too — buying/holding
// a subscription plan is a User-only concept, an Admin/Support account has none

route.get('/payment/plans',getPlans)
route.post('/payment/create-order',Auth,isUser,createOrder)
route.post('/payment/verify',Auth,isUser,verifyPayment)
route.get('/payment/history',Auth,isUser,getPaymentHistory)

module.exports = route
