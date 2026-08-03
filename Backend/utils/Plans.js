const User = require('../Models/User')
const logger = require('./logger')

// single source of truth for the three plans sir — change prices/limits ONLY here
// price is in paise because razorpay wants paise (19900 = Rs 199)
// credits / maxMessagesPerChat set to null means UNLIMITED sir
const PLANS = {
    Basic: {
        key: 'Basic',
        name: 'Basic',
        price: 0,
        credits: 5,
        maxMessagesPerChat: 60,
        contextWindow: 10,
        validityDays: null,
        features: [
            '5 free AI uses (ATS reviews + new chats)',
            'Up to 60 messages per chat',
            'Core ATS review with top 3 fixes',
            'Standard response speed',
        ]
    },
    Pro: {
        key: 'Pro',
        name: 'Pro',
        price: 19900,
        credits: 100,
        maxMessagesPerChat: 200,
        contextWindow: 20,
        validityDays: 30,
        features: [
            '100 AI uses per month (ATS reviews + new chats)',
            'Up to 200 messages per chat',
            'Deep ATS review: keyword analysis, section feedback, quick wins',
            'Full bullet/section rewrites and cover letters in chat',
            'Faster response speed',
            'Valid for 30 days',
        ]
    },
    ProMax: {
        key: 'ProMax',
        name: 'Pro Max',
        price: 49900,
        credits: 300,
        maxMessagesPerChat: 500,
        contextWindow: 30,
        validityDays: 30,
        features: [
            '300 AI uses per month (ATS reviews + new chats)',
            'Up to 500 messages per chat',
            'Everything in Pro + interview prep, red flags, learning roadmap',
            'Full career coach in chat: mock interviews, salary negotiation, LinkedIn',
            'Fastest response speed, no wait',
            'Valid for 30 days',
        ]
    },
}

// figure out which plan the user is REALLY on sir — an expired Pro is just a Basic
const getEffectivePlan = (user) => {
    if (
        user.Subscription &&
        user.SubType &&
        PLANS[user.SubType] &&
        user.SubscriptionExpires &&
        user.SubscriptionExpires > new Date()
    ) {
        return PLANS[user.SubType]
    }
    return PLANS.Basic
}

// load the user and return their effective plan sir
const getUserPlan = async (userId) => {
    const user = await User.findById(userId)
    if (!user) return null
    return getEffectivePlan(user)
}

// spend one AI credit sir — returns { ok, message, plan }
// used by the ATS review and by creating a new chat
//
// Accepts an optional mongoose session sir so the credit spend can join the SAME transaction as
// whatever the credit buys (the Review/Chat document). Without that, a failure after the
// increment but before the artifact save silently burned a paying user's credit with nothing
// to show for it. Callers that aren't in a transaction just omit it and behave as before.
const consumeCredit = async (userId, session) => {
    const user = await User.findById(userId).session(session)
    if (!user) {
        return { ok: false, message: 'User not found, please log in again' }
    }

    const plan = getEffectivePlan(user)

    // unlimited plan sir — still count the usage for stats, never block
    if (plan.credits === null) {
        await User.findByIdAndUpdate(userId, { $inc: { count: 1 } }, { session })
        return { ok: true, plan: plan.key }
    }

    // atomic check-and-increment so two parallel requests cannot both sneak in sir
    const updated = await User.findOneAndUpdate(
        { _id: userId, count: { $lt: plan.credits } },
        { $inc: { count: 1 } },
        { returnDocument: 'after', session }
    )

    if (!updated) {
        // top plan has nothing to upgrade to sir — tell them the credits renew instead
        const message =
            plan.key === 'Basic'
                ? 'The Free tier for using this project is over pleases make the purchase'
                : plan.key === 'ProMax'
                    ? `Your ${plan.name} plan credits for this month are over, they will refresh when your plan renews`
                    : `Your ${plan.name} plan credits are over, please upgrade to Pro Max`
        return { ok: false, message, plan: plan.key }
    }

    return { ok: true, plan: plan.key }
}

// hands a spent credit back sir — for the non-transactional callers (an AI route that already
// consumed a credit and only then had the upstream Groq call fail). Never drops below zero.
// Prefer passing a session to consumeCredit where a transaction is available; this is the
// compensating action for the paths where one isn't.
const refundCredit = async (userId, session) => {
    try {
        await User.findOneAndUpdate(
            { _id: userId, count: { $gt: 0 } },
            { $inc: { count: -1 } },
            { session }
        )
    } catch (err) {
        // a failed refund must never turn into a failed request sir — the user already has
        // their error; log it so the discrepancy is at least visible
        logger.error('failed to refund AI credit', { err, userId })
    }
}

module.exports = { PLANS, getEffectivePlan, getUserPlan, consumeCredit, refundCredit }
