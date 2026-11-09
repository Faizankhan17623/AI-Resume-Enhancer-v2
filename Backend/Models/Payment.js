const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
    {
        // who is paying sir
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // which plan they bought sir
        plan: {
            type: String,
            enum: ['Pro', 'ProMax'],
            required: true
        },
        // monthly vs yearly sir — decides which of the plan's two billingCycles (utils/Plans.js)
        // activatePaidOrder grants the validityDays from. Required going forward; existing rows
        // created before this field existed are all monthly (that was the only option), so
        // nothing needs a backfill — activatePaidOrder only ever reads this off a Payment created
        // through the current createOrder, never an old row.
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            required: true
        },
        // amount in paise, copied from the server-side plan config sir
        amount: {
            type: Number,
            required: true
        },
        // snapshotted from the cycle's validityDays at createOrder time sir, per 2026-11-10
        // audit — activatePaidOrder used to re-read validityDays off the LIVE utils/Plans.js
        // config at activation time, not off what was actually priced at purchase time. If an
        // admin edits/redeploys Plans.js between order creation and the webhook firing (can be
        // the full 30-minute payment-session window later), the user could be granted a
        // different duration than what they paid for. Required going forward; old rows created
        // before this field existed fall back to the live config's monthly validityDays in
        // activatePaidOrder, same as they always did (billingCycle's own comment above explains
        // why that's safe for pre-existing rows).
        validityDays: {
            type: Number,
        },
        currency: {
            type: String,
            default: 'INR'
        },
        // razorpay order id (order_xxx) sir
        orderId: {
            type: String,
            required: true,
            unique: true
        },
        // razorpay payment id (pay_xxx), filled after verification sir
        paymentId: {
            type: String,
        },
        // razorpay signature, kept as proof of verification sir
        signature: {
            type: String,
        },
        status: {
            type: String,
            enum: ['created', 'paid', 'failed', 'refunded'],
            default: 'created'
        },
        // set once an Admin issues a real Razorpay refund sir — refundId is Razorpay's own
        // rfnd_xxx id, refundAmount is in paise (may be less than `amount` for a partial refund).
        // status only flips to 'refunded' after Razorpay confirms the refund call succeeded.
        refundId: {
            type: String,
        },
        refundAmount: {
            type: Number,
        },
        refundedAt: {
            type: Date,
        },
        refundedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        refundReason: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Payment', paymentSchema)
