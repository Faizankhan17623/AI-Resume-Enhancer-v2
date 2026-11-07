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

// exactTotalRupees sir (optional) — when the user gives a fixed GST-inclusive price (e.g. "Pro
// Max must be exactly ₹2,000/mo"), base*1.18 can be a paisa off after rounding. Passing the exact
// total here pins the base+gst portion to it exactly and backs gst into the remainder instead.
//
// serviceChargeRupees sir (optional, 2026-11-08) — a flat, untaxed fee added on top of base+gst
// (e.g. ₹10), kept separate from `gst` since it's never itself taxed. Only disclosed at checkout,
// never on the pricing page (see Pricing.jsx/PlanCheckout.jsx).
const buildCycle = (baseRupees, validityDays, exactTotalRupees, serviceChargeRupees = 0) => {
    const gstRupees = round2(baseRupees * 0.18)
    const beforeServiceCharge = exactTotalRupees ?? round2(baseRupees + gstRupees)
    if (beforeServiceCharge < baseRupees) {
        throw new Error(`buildCycle: total (${beforeServiceCharge}) is less than base (${baseRupees}) — gst would be negative`)
    }
    const totalRupees = round2(beforeServiceCharge + serviceChargeRupees)
    return {
        basePrice: Math.round(baseRupees * 100),                           // paise
        gst: Math.round((beforeServiceCharge - baseRupees) * 100),         // paise
        serviceCharge: Math.round(serviceChargeRupees * 100),              // paise — flat, untaxed
        price: Math.round(totalRupees * 100),                              // paise — what Razorpay actually charges
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
        // per direct request (2026-11-08) sir — monthly AND yearly both show base + 18% GST +
        // a flat service charge as separate line items on checkout, GST added on top instead of
        // backed out of a flat total. Monthly: ₹1,500 base, ₹10 service charge, total ₹1,780/mo.
        // Yearly: ₹16,200 base, ₹4 service charge, total ₹19,120/yr — a ~10.5% saving over paying
        // monthly for 12 months (₹21,360), landing in the user's requested 10-15% range.
        billingCycles: {
            monthly: buildCycle(1500, 30, undefined, 10),
            yearly: buildCycle(16200, 365, undefined, 4),
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
        // per direct request (2026-11-08) sir — same change as Pro's above. Monthly: ₹2,000
        // base, ₹10 service charge, total ₹2,370/mo. Yearly: ₹21,204 base (was ₹1,900/mo-equiv,
        // now ~₹1,767/mo-equiv) — the old yearly base only gave a ~5.4% saving over paying
        // monthly for 12 months, well short of the user's requested 10-15% range, so it was
        // lowered until the saving landed at ~12% (total ₹25,026.72 vs ₹28,440 for 12× monthly).
        billingCycles: {
            monthly: buildCycle(2000, 30, undefined, 10),
            yearly: buildCycle(21204, 365, undefined, 6),
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
