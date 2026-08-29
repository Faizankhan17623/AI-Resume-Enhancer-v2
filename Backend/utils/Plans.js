const User = require('../Models/User')
const logger = require('./logger')

// single source of truth for the three plans sir — change prices/limits ONLY here
// price is in paise because razorpay wants paise (19900 = Rs 199)
// credits / maxMessagesPerChat set to null means UNLIMITED sir
//
// billingCycles sir, per direct request — Pro/ProMax now come in monthly AND yearly, each with
// its own base price + 18% GST baked into `price` (paise, what Razorpay actually charges).
// `basePrice`/`gst` are kept alongside `price` purely for the checkout review page's line-item
// breakdown (Order details: base + GST = total, matching the reference screenshots) — `price` is
// still the one number createOrder ever trusts for what to actually charge.
//
// Yearly is a single lump-sum charge for the full year (not 12 recurring charges) — same as the
// reference pricing page: the "/month" figure shown is a display rate only, matching Razorpay's
// one-time-order flow this app already uses (no Razorpay Subscriptions/auto-charge involved).
const round2 = (n) => Math.round(n * 100) / 100

const buildCycle = (baseRupees, validityDays) => {
    const gstRupees = round2(baseRupees * 0.18)
    const totalRupees = round2(baseRupees + gstRupees)
    return {
        basePrice: Math.round(baseRupees * 100),   // paise
        gst: Math.round(gstRupees * 100),          // paise
        price: Math.round(totalRupees * 100),      // paise — what Razorpay actually charges
        validityDays,
    }
}

const PLANS = {
    Basic: {
        key: 'Basic',
        name: 'Basic',
        price: 0,
        credits: 5,
        maxMessagesPerChat: 50,
        contextWindow: 120,
        validityDays: null,
        // Basic has no billingCycles sir — it's free, nothing to choose between. Its 5 credits
        // still reset monthly though (see creditCycleStart on the User model + this file's
        // resetCreditCycleIfNeeded), just via a rolling cycle instead of a plan purchase.
        features: [
            '5 free AI uses per month (ATS reviews + new chats)',
            'Up to 50 messages per chat',
            'Core ATS review with top 3 fixes',
            'Standard response speed',
        ]
    },
    Pro: {
        key: 'Pro',
        name: 'Pro',
        credits: 100,
        maxMessagesPerChat: 250,
        contextWindow: 100,
        // per direct request sir — ₹1,200/mo, ₹1,000/mo-equivalent billed yearly, both + 18% GST
        billingCycles: {
            monthly: buildCycle(1200, 30),
            yearly: buildCycle(1000 * 12, 365),
        },
        features: [
            '100 AI uses per month (ATS reviews + new chats)',
            'Up to 250 messages per chat',
            'Deep ATS review: keyword analysis, section feedback, quick wins',
            'Full bullet/section rewrites and cover letters in chat',
            'Faster response speed',
        ]
    },
    ProMax: {
        key: 'ProMax',
        name: 'Pro Max',
        credits: 300,
        maxMessagesPerChat: 500,
        contextWindow: 30,
        // per direct request sir — ₹1,500/mo, ₹1,300/mo-equivalent billed yearly, both + 18% GST
        billingCycles: {
            monthly: buildCycle(1500, 30),
            yearly: buildCycle(1300 * 12, 365),
        },
        features: [
            '300 AI uses per month (ATS reviews + new chats)',
            'Up to 500 messages per chat',
            'Everything in Pro + interview prep, red flags, learning roadmap',
            'Full career coach in chat: mock interviews, salary negotiation, LinkedIn',
            'Fastest response speed, no wait',
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

// Basic-tier credit reset sir — lazy rolling monthly cycle, same discipline as
// RecruiterPlans.js's resetRecruiterCycleIfNeeded: checked/applied the moment a credit spend is
// actually attempted, no cron needed. Only ever touches a Basic-effective account — a paid
// Pro/ProMax user's credits reset via SubscriptionExpires + the reconcile cron instead, so this
// must never fire for them (an active paid subscriber mid-cycle should never have `count` reset
// early just because creditCycleStart happens to be stale from before they upgraded).
const CREDIT_CYCLE_MS = 30 * 24 * 60 * 60 * 1000

const resetCreditCycleIfNeeded = async (user) => {
    const isBasic = getEffectivePlan(user).key === 'Basic'
    if (!isBasic) return user

    if (!user.creditCycleStart) {
        const updated = await User.findOneAndUpdate(
            { _id: user._id, creditCycleStart: user.creditCycleStart },
            { $set: { creditCycleStart: new Date() } },
            { returnDocument: 'after' }
        )
        return updated || user
    }

    const elapsed = Date.now() - new Date(user.creditCycleStart).getTime()
    if (elapsed < CREDIT_CYCLE_MS) return user

    const updated = await User.findOneAndUpdate(
        { _id: user._id, creditCycleStart: user.creditCycleStart },
        { $set: { creditCycleStart: new Date(), count: 0 } },
        { returnDocument: 'after' }
    )
    return updated || user
}

// spend one AI credit sir — returns { ok, message, plan }
// used by the ATS review and by creating a new chat
//
// Accepts an optional mongoose session sir so the credit spend can join the SAME transaction as
// whatever the credit buys (the Review/Chat document). Without that, a failure after the
// increment but before the artifact save silently burned a paying user's credit with nothing
// to show for it. Callers that aren't in a transaction just omit it and behave as before.
const consumeCredit = async (userId, session) => {
    let user = await User.findById(userId).session(session)
    if (!user) {
        return { ok: false, message: 'User not found, please log in again' }
    }

    // Basic's monthly reset sir — deliberately OUTSIDE the session param above: this is a
    // lazy maintenance write (like the recruiter cycle reset), not part of the credit-spend
    // transaction itself, same reasoning RecruiterPlans.js's own reset uses
    user = await resetCreditCycleIfNeeded(user)

    const plan = getEffectivePlan(user)

    // unlimited plan sir — still count the usage for stats, never block
    if (plan.credits === null) {
        await User.findByIdAndUpdate(userId, { $inc: { count: 1 } }, { session })
        return { ok: true, plan: plan.key }
    }

    // atomic check-and-increment so two parallel requests cannot both sneak in sir — plan
    // allowance first, same as before
    const updated = await User.findOneAndUpdate(
        { _id: userId, count: { $lt: plan.credits } },
        { $inc: { count: 1 } },
        { returnDocument: 'after', session }
    )

    if (updated) {
        return { ok: true, plan: plan.key }
    }

    // plan allowance is used up sir — fall back to the bonus pool (admin grants, referral
    // rewards) before blocking. Tracked as its own counter, spentBonus, rather than mixed into
    // `count`, so the profile page can show "used your plan credits, now drawing down N bonus"
    // instead of a used-count that silently exceeds the plan's displayed cap.
    const bonusSpend = await User.findOneAndUpdate(
        { _id: userId, bonusCredits: { $gt: 0 } },
        { $inc: { bonusCredits: -1, spentBonus: 1 } },
        { returnDocument: 'after', session }
    )

    if (bonusSpend) {
        return { ok: true, plan: plan.key }
    }

    // top plan has nothing to upgrade to sir — tell them the credits renew instead.
    // `code` sir — a machine-readable reason the frontend can switch on (see the
    // Dashboard's upgrade-upsell card), instead of string-matching `message` which is
    // free-text copy that can change independently. 'UPGRADE_AVAILABLE' covers both Basic
    // (upgrade to any paid plan) and Pro (upgrade to ProMax) — anywhere there's a paid tier
    // above the user's current one worth showing a "View plans" button for. ProMax has
    // nothing above it, so it gets its own code and the frontend shows no upgrade CTA there.
    const isTopPlan = plan.key === 'ProMax'
    const message = isTopPlan
        ? `Your ${plan.name} plan credits for this month are over, they will refresh when your plan renews`
        : plan.key === 'Basic'
            ? 'Your free monthly AI uses are over for now — they refresh next month, or upgrade for a lot more today'
            : `Your ${plan.name} plan credits are over, please upgrade to Pro Max`
    return { ok: false, message, plan: plan.key, code: isTopPlan ? 'CREDITS_RENEW' : 'UPGRADE_AVAILABLE' }
}

// hands a spent credit back sir — for the non-transactional callers (an AI route that already
// consumed a credit and only then had the upstream Groq call fail). Never drops below zero.
// Prefer passing a session to consumeCredit where a transaction is available; this is the
// compensating action for the paths where one isn't.
//
// Mirrors consumeCredit's spend order in reverse: if this user has spent into their bonus pool
// (spentBonus > 0), the refund hands a bonus credit back first, since that's what was actually
// just spent for anyone over their plan allowance. Otherwise it refunds a plain plan credit.
const refundCredit = async (userId, session) => {
    try {
        const bonusRefund = await User.findOneAndUpdate(
            { _id: userId, spentBonus: { $gt: 0 } },
            { $inc: { bonusCredits: 1, spentBonus: -1 } },
            { session }
        )
        if (bonusRefund) return

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

module.exports = { PLANS, getEffectivePlan, getUserPlan, consumeCredit, refundCredit, resetCreditCycleIfNeeded }
