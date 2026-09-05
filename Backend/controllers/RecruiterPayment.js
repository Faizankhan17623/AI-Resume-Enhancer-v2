const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const RazorpayInstance = require('../utils/Razorpay')
const RecruiterPayment = require('../Models/RecruiterPayment')
const User = require('../Models/User')
const { RECRUITER_PLANS } = require('../utils/RecruiterPlans')
const { withTransaction } = require('../utils/withTransaction')
const logger = require('../utils/logger')
const { safeSignatureEqual } = require('../utils/safeSignatureEqual')

// mirrors controllers/Payment.js's checkout/webhook mechanics EXACTLY (same Razorpay SDK
// instance, same payment-session-cookie pattern, same HMAC verify, same idempotent-activation-
// via-transaction shape) but as fully SEPARATE, parallel functions — per direct request, a
// Recruiter plan purchase must never call or touch activatePaidOrder, the Payment model, or any
// User.Subscription/SubType field. Everything here reads/writes ONLY recruiterPlan/
// recruiterPlanExpiresAt (Models/User.js) and the RecruiterPayment collection.

const RECRUITER_PAYMENT_SESSION_COOKIE = 'recruiterPaymentSession'
const PAYMENT_SESSION_MINUTES = 30

const paymentCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: PAYMENT_SESSION_MINUTES * 60 * 1000,
}

// shared activation step sir — same "one transaction, idempotent via a status:{$ne:'paid'}
// filter" shape as controllers/Payment.js's activatePaidOrder, own copy so the two plan systems
// can never accidentally share a code path.
const activateRecruiterOrder = async (orderId, paymentId, signature) => {
    return withTransaction(async (session) => {
        const payment = await RecruiterPayment.findOneAndUpdate(
            { orderId, status: { $ne: 'paid' } },
            { status: 'paid', paymentId, signature },
            { returnDocument: 'after', session }
        )

        if (!payment) {
            const existing = await RecruiterPayment.findOne({ orderId }).session(session)
            if (!existing) return null
            return { payment: existing, plan: RECRUITER_PLANS[existing.plan], expires: existing.updatedAt, alreadyPaid: true }
        }

        const plan = RECRUITER_PLANS[payment.plan]
        const cycle = plan.billingCycles[payment.billingCycle]
        const expires = new Date(Date.now() + cycle.validityDays * 24 * 60 * 60 * 1000)

        // recruiterPlan/recruiterPlanExpiresAt ONLY sir — never Subscription/SubType/
        // SubscriptionExpires, those belong solely to the User plan system (utils/Plans.js)
        await User.findByIdAndUpdate(
            payment.user,
            { recruiterPlan: payment.plan, recruiterPlanExpiresAt: expires },
            { session }
        )

        return { payment, plan, expires, alreadyPaid: false }
    })
}

// GET /recruiter/payment/plans — public list of the Recruiter plans for the recruiter pricing page.
// Basic has no billingCycles (it's free); Pro/ProMax each carry both, same shape as
// controllers/Payment.js's getPlans — priceInRupees always the GST-inclusive total actually charged.
exports.getRecruiterPlans = (req, res) => {
    try {
        const plans = Object.values(RECRUITER_PLANS).map((p) => ({
            key: p.key,
            name: p.name,
            jobPostings: p.jobPostings,
            aiScores: p.aiScores,
            jdWrites: p.jdWrites,
            interviewQGen: p.interviewQGen,
            summaries: p.summaries,
            features: p.features,
            ...(p.billingCycles
                ? {
                    billingCycles: Object.fromEntries(
                        Object.entries(p.billingCycles).map(([cycleKey, cycle]) => [
                            cycleKey,
                            {
                                basePriceInRupees: cycle.basePrice / 100,
                                gstInRupees: cycle.gst / 100,
                                priceInRupees: cycle.price / 100,
                                validityDays: cycle.validityDays,
                            },
                        ])
                    ),
                }
                : { priceInRupees: 0 }),
        }))

        return res.status(200).json({ success: true, plans })
    } catch (error) {
        logger.error('failed to list recruiter plans', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the plans',
        })
    }
}

// POST /recruiter/payment/create-order — make a razorpay order for Recruiter Pro or ProMax.
// billingCycle ('monthly' | 'yearly') picks WHICH of the plan's two prices to charge — still
// entirely server-resolved from utils/RecruiterPlans.js, never trusts a client-supplied amount.
exports.createRecruiterOrder = async (req, res) => {
    try {
        const id = req?.User.id
        const { plan, billingCycle } = req.body

        if (!plan || !RECRUITER_PLANS[plan] || !RECRUITER_PLANS[plan].billingCycles) {
            return res.status(400).json({
                success: false,
                message: 'Please pick a valid plan to purchase (Pro or ProMax)',
            })
        }

        const cycle = RECRUITER_PLANS[plan].billingCycles[billingCycle]
        if (!cycle) {
            return res.status(400).json({
                success: false,
                message: 'Please pick monthly or yearly billing',
            })
        }

        const order = await RazorpayInstance.orders.create({
            amount: cycle.price,
            currency: 'INR',
            receipt: `rec${id}${Date.now()}`.slice(0, 40),
            notes: {
                userId: String(id),
                plan,
                billingCycle,
                context: 'recruiter',
            }
        })

        await RecruiterPayment.create({
            user: id,
            plan,
            billingCycle,
            amount: cycle.price,
            orderId: order.id,
            status: 'created'
        })

        const sessionToken = jwt.sign(
            { orderId: order.id, userId: String(id), plan, billingCycle },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: `${PAYMENT_SESSION_MINUTES}m` }
        )
        res.cookie(RECRUITER_PAYMENT_SESSION_COOKIE, sessionToken, paymentCookieOptions)

        return res.status(200).json({
            success: true,
            message: 'Order created successfully',
            order,
            key: process.env.RAZORPAY_KEY_ID
        })
    } catch (error) {
        logger.error('failed to create recruiter payment order', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the order',
        })
    }
}

// POST /recruiter/payment/verify — check the razorpay signature and unlock the Recruiter plan
exports.verifyRecruiterPayment = async (req, res) => {
    try {
        const id = req?.User.id
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Order id, payment id and signature are required',
            })
        }

        const sessionToken = req.cookies?.[RECRUITER_PAYMENT_SESSION_COOKIE]
        if (!sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'Your payment session has expired, please start the purchase again',
            })
        }

        let session
        try {
            session = jwt.verify(sessionToken, process.env.JWT_PRIVATE_KEY)
        } catch (sessionErr) {
            res.clearCookie(RECRUITER_PAYMENT_SESSION_COOKIE)
            return res.status(400).json({
                success: false,
                message: 'Your payment session has expired, please start the purchase again',
            })
        }

        if (session.orderId !== razorpay_order_id || session.userId !== String(id)) {
            res.clearCookie(RECRUITER_PAYMENT_SESSION_COOKIE)
            return res.status(400).json({
                success: false,
                message: 'This payment does not match your session, please start the purchase again',
            })
        }

        const existing = await RecruiterPayment.findOne({ orderId: razorpay_order_id, user: id })
        if (existing && existing.status === 'paid') {
            res.clearCookie(RECRUITER_PAYMENT_SESSION_COOKIE)
            const plan = RECRUITER_PLANS[existing.plan]
            return res.status(200).json({
                success: true,
                message: `Payment already verified, you are on the Recruiter ${plan.name} plan`,
                plan: existing.plan,
                expiresAt: existing.updatedAt,
            })
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (!safeSignatureEqual(expectedSignature, razorpay_signature)) {
            await RecruiterPayment.findOneAndUpdate(
                { orderId: razorpay_order_id, user: id },
                { status: 'failed' }
            )
            res.clearCookie(RECRUITER_PAYMENT_SESSION_COOKIE)
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed',
            })
        }

        const activation = await activateRecruiterOrder(razorpay_order_id, razorpay_payment_id, razorpay_signature)

        if (!activation) {
            return res.status(404).json({
                success: false,
                message: 'Order not found for this user',
            })
        }

        res.clearCookie(RECRUITER_PAYMENT_SESSION_COOKIE)

        if (activation.alreadyPaid) {
            return res.status(200).json({
                success: true,
                message: `Payment already verified, you are on the Recruiter ${activation.plan.name} plan`,
                plan: activation.payment.plan,
                expiresAt: activation.expires,
            })
        }

        return res.status(200).json({
            success: true,
            message: `Payment successful, you are now on the Recruiter ${activation.plan.name} plan`,
            plan: activation.payment.plan,
            expiresAt: activation.expires
        })
    } catch (error) {
        logger.error('failed to verify recruiter payment', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while verifying the payment',
        })
    }
}

// POST /recruiter/payment/webhook — server-to-server from Razorpay, same reasoning/mechanics as
// controllers/Payment.js's paymentWebhook (raw-body HMAC verification, idempotency guard), own
// copy so it can never accidentally activate a User-side Payment row.
exports.recruiterPaymentWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
        if (!webhookSecret) {
            logger.error('RAZORPAY_WEBHOOK_SECRET is not set, rejecting recruiter webhook call')
            return res.status(503).json({ success: false, message: 'Webhook not configured' })
        }

        const signature = req.headers['x-razorpay-signature']
        if (!signature) {
            return res.status(400).json({ success: false, message: 'Missing signature header' })
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(req.body)
            .digest('hex')

        if (!safeSignatureEqual(expectedSignature, signature)) {
            logger.warn('recruiter payment webhook signature mismatch, rejecting')
            return res.status(400).json({ success: false, message: 'Invalid signature' })
        }

        const event = JSON.parse(req.body.toString('utf8'))

        const isCaptured = event.event === 'payment.captured' || event.event === 'order.paid'
        if (!isCaptured) {
            return res.status(200).json({ success: true, message: 'Event ignored' })
        }

        const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id
        const paymentEntity = event.payload?.payment?.entity
        const razorpayPaymentId = paymentEntity?.id

        if (!orderId) {
            logger.warn('recruiter payment webhook had no order id in payload, ignoring')
            return res.status(200).json({ success: true, message: 'No order id in payload, ignored' })
        }

        // scoped to RecruiterPayment only sir — a User-plan order id will simply not be found
        // here (separate collection), so this webhook can never cross-activate the wrong system
        const existing = await RecruiterPayment.findOne({ orderId })
        if (!existing) {
            return res.status(200).json({ success: true, message: 'Order not found, ignored' })
        }

        if (existing.status === 'paid') {
            return res.status(200).json({ success: true, message: 'Already processed' })
        }

        const activation = await activateRecruiterOrder(orderId, razorpayPaymentId || existing.paymentId, existing.signature)

        if (activation?.alreadyPaid) {
            return res.status(200).json({ success: true, message: 'Already processed' })
        }

        logger.info('recruiter payment activated via webhook', { orderId, plan: activation?.payment?.plan })
        return res.status(200).json({ success: true, message: 'Payment activated via webhook' })
    } catch (error) {
        logger.error('recruiter payment webhook failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while processing the payment webhook',
        })
    }
}

// GET /recruiter/payment/history — the recruiter's own Recruiter-plan payments
exports.getRecruiterPaymentHistory = async (req, res) => {
    try {
        const id = req?.User.id

        const payments = await RecruiterPayment.find({ user: id })
            .select('plan amount currency status orderId createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, payments })
    } catch (error) {
        logger.error('failed to get recruiter payment history', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the payment history',
        })
    }
}
