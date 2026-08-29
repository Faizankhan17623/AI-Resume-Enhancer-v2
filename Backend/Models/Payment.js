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
            enum: ['created', 'paid', 'failed'],
            default: 'created'
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('Payment', paymentSchema)
