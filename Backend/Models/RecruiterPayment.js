const mongoose = require('mongoose')

// a SEPARATE collection from Payment.js sir, on purpose — per direct request, Recruiter plan
// purchases must never touch the User payment system in any way. Same shape/fields as Payment.js
// (mirrors its Razorpay order/verify/webhook lifecycle exactly), just its own collection so the
// existing Admin Payments dashboard (which assumes User-plan semantics throughout: PLANS keys,
// SubType, etc.) is never silently fed a row it doesn't expect.
const recruiterPaymentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Recruiter plan keys sir — same STRING values as the User PLANS ('Pro'/'ProMax') but a
        // completely distinct enum/table (utils/RecruiterPlans.js's RECRUITER_PLANS), never the
        // same JS object or Mongoose model as the User-side Payment.plan
        plan: {
            type: String,
            enum: ['Pro', 'ProMax'],
            required: true
        },
        // monthly vs yearly sir — decides which of the plan's two billingCycles
        // (utils/RecruiterPlans.js) activateRecruiterOrder grants the validityDays from. Same
        // reasoning as Models/Payment.js's own billingCycle field — required going forward, no
        // backfill needed since old rows predate this field ever having a choice.
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'INR'
        },
        orderId: {
            type: String,
            required: true,
            unique: true
        },
        paymentId: {
            type: String,
        },
        signature: {
            type: String,
        },
        status: {
            type: String,
            enum: ['created', 'paid', 'failed'],
            default: 'created'
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('RecruiterPayment', recruiterPaymentSchema)
