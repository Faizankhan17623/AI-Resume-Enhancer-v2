const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const RazorpayInstance = require('../utils/Razorpay')
const Payment = require('../Models/Payment')
const User = require('../Models/User')
const { PLANS } = require('../utils/Plans')

// the payment session cookie sir — set at order time, demanded back at verify time
// signed httpOnly cookie, so the browser that STARTED the checkout must be the one that finishes it
const PAYMENT_SESSION_COOKIE = 'paymentSession'
const PAYMENT_SESSION_MINUTES = 30

const paymentCookieOptions = {
    httpOnly: true,             // JS on the page can never read it sir
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PAYMENT_SESSION_MINUTES * 60 * 1000,
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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

        // signature is genuine sir — mark the order paid
        const payment = await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id, user: id },
            {
                status: 'paid',
                paymentId: razorpay_payment_id,
                signature: razorpay_signature
            },
            { returnDocument: 'after' }
        )

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Order not found for this user',
            })
        }

        const plan = PLANS[payment.plan]
        const expires = new Date(Date.now() + plan.validityDays * 24 * 60 * 60 * 1000)

        // unlock the plan sir — count goes back to 0 so the new credits start fresh
        await User.findByIdAndUpdate(id, {
            Subscription: true,
            SubType: payment.plan,
            SubscriptionExpires: expires,
            count: 0
        })

        // the session did its job sir — clear it so it cannot be replayed
        res.clearCookie(PAYMENT_SESSION_COOKIE)

        return res.status(200).json({
            success: true,
            message: `Payment successful, you are now on the ${plan.name} plan`,
            plan: payment.plan,
            expiresAt: expires
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the payment history',
        })
    }
}
