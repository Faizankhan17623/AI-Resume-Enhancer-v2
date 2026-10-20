// Payment schemas sir — the amount is NEVER taken from the client, only the plan key. See
// controllers/Payment.js, controllers/RecruiterPayment.js and Models/Payment.js.

const { z } = require('zod')
const { planKey } = require('./Shared')

// billingCycle sir — new for the monthly/yearly toggle, per direct request. The amount itself
// still ALWAYS comes from utils/Plans.js's server-side config (createOrder), this only says
// which of the plan's two cycles to charge.
const billingCycle = z.enum(['monthly', 'yearly'], { error: 'Please pick monthly or yearly billing' })

const createOrderSchema = z.object({ plan: planKey, billingCycle })

const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string().min(1, 'Order id is required'),
    razorpay_payment_id: z.string().min(1, 'Payment id is required'),
    razorpay_signature: z.string().min(1, 'Signature is required'),
})

// Recruiter plan purchase sir — a DISTINCT schema/enum from planKey/createOrderSchema above, even
// though the string values overlap ('Pro'/'ProMax'), per the explicit instruction to keep the
// Recruiter and User plan/payment systems completely separate end to end. verifyPaymentSchema's
// shape has nothing plan-specific in it (just the three Razorpay fields), so it's reused as-is —
// see controllers/RecruiterPayment.js.
const recruiterPlanKey = z.enum(['Pro', 'ProMax'], { error: 'Please pick a valid plan' })
const recruiterCreateOrderSchema = z.object({ plan: recruiterPlanKey, billingCycle })

module.exports = {
    createOrderSchema,
    verifyPaymentSchema,
    recruiterCreateOrderSchema,
}
