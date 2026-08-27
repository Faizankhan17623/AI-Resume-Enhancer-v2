const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isApprovedRecruiter } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { recruiterCreateOrderSchema, verifyPaymentSchema } = require('../Validation/schemas.js')
const {
    getRecruiterPlans,
    createRecruiterOrder,
    verifyRecruiterPayment,
    getRecruiterPaymentHistory,
    recruiterPaymentWebhook,
} = require('../controllers/RecruiterPayment.js')

// completely separate URL space from Routes/Payment.js sir — /recruiter/payment/*, mirroring
// its own controller (controllers/RecruiterPayment.js), which is itself a full parallel copy of
// the User payment flow rather than a shared code path. isRecruiter (not isUser) gates every
// authenticated route here, same reasoning: buying a Recruiter plan is a Recruiter-only concept.

route.get('/recruiter/payment/plans', getRecruiterPlans)
route.post('/recruiter/payment/create-order', Auth, isRecruiter, isApprovedRecruiter, validate({ body: recruiterCreateOrderSchema }), createRecruiterOrder)
route.post('/recruiter/payment/verify', Auth, isRecruiter, isApprovedRecruiter, validate({ body: verifyPaymentSchema }), verifyRecruiterPayment)
route.get('/recruiter/payment/history', Auth, isRecruiter, isApprovedRecruiter, getRecruiterPaymentHistory)

// server-to-server from Razorpay sir — same reasoning as Routes/Payment.js's own webhook route:
// no Auth/isRecruiter (Razorpay isn't a logged-in user), no validate() (req.body is the raw
// Buffer the signature is computed over). Needs express.raw() body parsing, wired up in index.js
// on this exact path, before the global express.json().
route.post('/recruiter/payment/webhook', recruiterPaymentWebhook)

module.exports = route
