const User = require('../Models/User')

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
const consumeCredit = async (userId) => {
    const user = await User.findById(userId)
    if (!user) {
        return { ok: false, message: 'User not found, please log in again' }
    }

    const plan = getEffectivePlan(user)

    // unlimited plan sir — still count the usage for stats, never block
    if (plan.credits === null) {
        await User.findByIdAndUpdate(userId, { $inc: { count: 1 } })
        return { ok: true, plan: plan.key }
    }

    // atomic check-and-increment so two parallel requests cannot both sneak in sir
    const updated = await User.findOneAndUpdate(
        { _id: userId, count: { $lt: plan.credits } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
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

module.exports = { PLANS, getEffectivePlan, getUserPlan, consumeCredit }
