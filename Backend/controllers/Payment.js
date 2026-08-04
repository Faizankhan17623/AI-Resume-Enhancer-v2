const jwt = require('jsonwebtoken')
const RazorpayInstance = require('../utils/Razorpay')
const Payment = require('../Models/Payment')
const User = require('../Models/User')
const { PLANS } = require('../utils/Plans')
const { withTransaction } = require('../utils/withTransaction')
const logger = require('../utils/logger')

// the payment session cookie sir — set at order time, demanded back at verify time
// signed httpOnly cookie, so the browser that STARTED the checkout must be the one that finishes it
const PAYMENT_SESSION_COOKIE = 'paymentSession'
const PAYMENT_SESSION_MINUTES = 30

// sir — frontend (Vercel) and backend (Render) are different domains, so this cookie travels
// cross-site on every create-order/verify axios call. sameSite:'lax' silently drops cross-site
// XHR/fetch cookies (it only rides along on top-level navigations), so verify always saw no
// cookie and returned "session expired" even for a genuinely fresh, successful payment.
// sameSite:'none' is required for cross-site delivery, and browsers mandate secure:true whenever
// sameSite is 'none' — so secure can no longer be conditional on NODE_ENV.
const paymentCookieOptions = {
    httpOnly: true,             // JS on the page can never read it sir
    secure: true,
    sameSite: 'none',
    maxAge: PAYMENT_SESSION_MINUTES * 60 * 1000,
}

// shared activation step sir — both /verify (client-driven) and /payment/webhook
// (server-to-server, from Razorpay directly) need to do exactly this once a payment is
// confirmed genuine: mark the Payment record paid and extend the user's subscription.
// Pulled out so the two paths can never drift apart. Caller is responsible for the
// idempotency check (skip calling this if the record is already 'paid') and for whatever
// signature verification proves the payment is real in the first place.
//
// Both writes run inside ONE transaction sir — this is the money path, and a crash between
// "Payment marked paid" and "User upgraded" used to leave a customer charged with no plan,
// a state nothing in the codebase could detect or repair. Now either both land or neither does.
//
// The status:'created' filter also makes activation atomically idempotent: /verify and the
// Razorpay webhook can race for the same order, and only the one that actually flips the row
// away from 'created' proceeds to extend the subscription. The loser gets alreadyPaid, so a
// duplicate event can never stack a second 30 days onto SubscriptionExpires.
const activatePaidOrder = async (orderId, paymentId, signature) => {
    return withTransaction(async (session) => {
        const payment = await Payment.findOneAndUpdate(
            { orderId, status: { $ne: 'paid' } },
            {
                status: 'paid',
                paymentId,
                signature,
            },
            { returnDocument: 'after', session }
        )

        if (!payment) {
            // either no such order at all, or another path (verify/webhook) already activated
            // it sir — distinguish the two so the caller can answer correctly
            const existing = await Payment.findOne({ orderId }).session(session)
            if (!existing) return null
            return { payment: existing, plan: PLANS[existing.plan], expires: existing.updatedAt, alreadyPaid: true }
        }

        const plan = PLANS[payment.plan]
        const expires = new Date(Date.now() + plan.validityDays * 24 * 60 * 60 * 1000)

        // unlock the plan sir — count goes back to 0 so the new credits start fresh
        await User.findByIdAndUpdate(
            payment.user,
            {
                Subscription: true,
                SubType: payment.plan,
                SubscriptionExpires: expires,
                count: 0
            },
            { session }
        )

        return { payment, plan, expires, alreadyPaid: false }
    })
}

// GET /payment/plans — public list of the three plans for the pricing page sir
exports.getPlans = (req, res) => {
    try {
        const plans = Object.values(PLANS).map((p) => ({
            key: p.key,
            name: p.name,
            price: p.price,
            priceInRupees: p.price / 100,
            validityDays: p.validityDays,
            features: p.features
        }))

        return res.status(200).json({
            success: true,
            plans
        })
    } catch (error) {
        logger.error('failed to list plans', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the plans',
        })
    }
}

// POST /payment/create-order — make a razorpay order for Pro or ProMax sir
exports.createOrder = async (req, res) => {
    try {
        const id = req?.User.id
        const { plan } = req.body

        // the amount ALWAYS comes from the server config, never from the frontend sir
        if (!plan || !PLANS[plan] || PLANS[plan].price === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please pick a valid plan to purchase (Pro or ProMax)',
            })
        }

        const order = await RazorpayInstance.orders.create({
            amount: PLANS[plan].price,
            currency: 'INR',
            // razorpay caps receipt at 40 chars sir — id (24) + timestamp (13) alone is already 37, so drop the prefix/separators
            receipt: `${id}${Date.now()}`,
            notes: {
                userId: String(id),
                plan
            }
        })

        // keep our own record of the order so verify can find it later sir
        await Payment.create({
            user: id,
            plan,
            amount: PLANS[plan].price,
            orderId: order.id,
            status: 'created'
        })

        // start the payment session sir — a 30-minute signed cookie tying THIS order to THIS user's browser
        const sessionToken = jwt.sign(
            { orderId: order.id, userId: String(id), plan },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: `${PAYMENT_SESSION_MINUTES}m` }
        )
        res.cookie(PAYMENT_SESSION_COOKIE, sessionToken, paymentCookieOptions)

        return res.status(200).json({
            success: true,
            message: 'Order created successfully',
            order,
            // the frontend needs the public key to open the razorpay checkout sir
            key: process.env.RAZORPAY_KEY_ID
        })
    } catch (error) {
        logger.error('failed to create payment order', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the order',
        })
    }
}

// POST /payment/verify — check the razorpay signature and unlock the plan sir
exports.verifyPayment = async (req, res) => {
    try {
        const id = req?.User.id
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        // not case sir — all three come back from the razorpay checkout
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Order id, payment id and signature are required',
            })
        }

        // check the payment session sir — verify must come from the same browser that created the order,
        // within 30 minutes, for the SAME order and the SAME user
        const sessionToken = req.cookies?.[PAYMENT_SESSION_COOKIE]
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
            res.clearCookie(PAYMENT_SESSION_COOKIE)
            return res.status(400).json({
                success: false,
                message: 'Your payment session has expired, please start the purchase again',
            })
        }

        if (session.orderId !== razorpay_order_id || session.userId !== String(id)) {
            res.clearCookie(PAYMENT_SESSION_COOKIE)
            return res.status(400).json({
                success: false,
                message: 'This payment does not match your session, please start the purchase again',
            })
        }

        // idempotency guard sir — a retried/duplicate verify call (double-click, client retry
        // after a flaky response, or a race with the webhook in Payment.js's route) for an
        // order already marked paid must be a no-op, not another SubscriptionExpires extension
        const existing = await Payment.findOne({ orderId: razorpay_order_id, user: id })
        if (existing && existing.status === 'paid') {
            res.clearCookie(PAYMENT_SESSION_COOKIE)
            const plan = PLANS[existing.plan]
            return res.status(200).json({
                success: true,
                message: `Payment already verified, you are on the ${plan.name} plan`,
                plan: existing.plan,
                expiresAt: existing.updatedAt,
            })
        }

        // recompute the signature with our secret sir — this is what proves the payment
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (expectedSignature !== razorpay_signature) {
            // mark our record failed so we can see fake/broken attempts sir
            await Payment.findOneAndUpdate(
                { orderId: razorpay_order_id, user: id },
                { status: 'failed' }
            )
            res.clearCookie(PAYMENT_SESSION_COOKIE)
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed',
            })
        }

        // signature is genuine sir — mark the order paid and unlock the plan (shared with
        // the /payment/webhook path so both stay consistent, see activatePaidOrder above)
        const activation = await activatePaidOrder(razorpay_order_id, razorpay_payment_id, razorpay_signature)

        if (!activation) {
            return res.status(404).json({
                success: false,
                message: 'Order not found for this user',
            })
        }

        // the session did its job sir — clear it so it cannot be replayed
        res.clearCookie(PAYMENT_SESSION_COOKIE)

        // the webhook beat us to it between our idempotency check above and the activation sir —
        // still a success from the user's point of view, just not a second activation
        if (activation.alreadyPaid) {
            return res.status(200).json({
                success: true,
                message: `Payment already verified, you are on the ${activation.plan.name} plan`,
                plan: activation.payment.plan,
                expiresAt: activation.expires,
            })
        }

        return res.status(200).json({
            success: true,
            message: `Payment successful, you are now on the ${activation.plan.name} plan`,
            plan: activation.payment.plan,
            expiresAt: activation.expires
        })
    } catch (error) {
        logger.error('failed to verify payment', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while verifying the payment',
        })
    }
}

// GET /payment/history — the user's own payments sir
exports.getPaymentHistory = async (req, res) => {
    try {
        const id = req?.User.id

        const payments = await Payment.find({ user: id })
            .select('plan amount currency status orderId createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            payments
        })
    } catch (error) {
        logger.error('failed to get payment history', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the payment history',
        })
    }
}
