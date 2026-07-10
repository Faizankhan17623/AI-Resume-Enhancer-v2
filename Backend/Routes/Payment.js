const express = require('express')
const route = express.Router()
const {Auth} = require('../Middlewares/Auth.js')
const {
    getPlans,
    createOrder,
    verifyPayment,
    getPaymentHistory
} = require('../controllers/Payment.js')

// everything about money lives here sir

route.get('/payment/plans',getPlans)
route.post('/payment/create-order',Auth,createOrder)
route.post('/payment/verify',Auth,verifyPayment)
route.get('/payment/history',Auth,getPaymentHistory)

module.exports = route
