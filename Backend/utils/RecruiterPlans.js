const User = require('../Models/User')
const logger = require('./logger')

// single source of truth for Recruiter plans sir — completely separate table from
// utils/Plans.js's PLANS. Change Recruiter prices/limits ONLY here. null means unlimited.
// price is in paise (razorpay convention), same as utils/Plans.js.

const round2 = (n) => Math.round(n * 100) / 100

// same helper as utils/Plans.js's buildCycle sir, duplicated on purpose rather than shared/
// imported — per direct request, the Recruiter plan system must never share a code path with
// the User one, even a pure-function pricing helper, so the two can never accidentally drift
// into touching each other.
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

const RECRUITER_PLANS = {
    Basic: {
        key: 'Basic',
        name: 'Basic',
        price: 0,
        jobPostings: 10,
        aiScores: 100,
        jdWrites: 2,
        interviewQGen: 2,
        summaries: 5,
        validityDays: null,
        features: [
            '10 active job postings per month',
            '100 AI-scored applicants per month',
            'Manual applicant review only',
        ],
    },
    Pro: {
        key: 'Pro',
        name: 'Pro',
        jobPostings: 100,
        aiScores: 1000,
        jdWrites: 20,
        interviewQGen: 20,
        summaries: 100,
        // monthly Rs 1500, yearly Rs 1300/mo rate billed as one lump sum (Rs 15600/yr), both +18%
        // GST sir, same one-time-Razorpay-order architecture as utils/Plans.js — no recurring
        // Subscriptions API here either
        billingCycles: {
            monthly: buildCycle(1500, 30),
            yearly: buildCycle(1300 * 12, 365),
        },
        features: [
            '100 active job postings per month',
            '1000 AI-scored applicants per month',
            'Proctored tests included',
            '20 AI job-description drafts per month',
            '20 AI interview-question generations per month',
            '100 AI candidate summaries per month',
        ],
    },
    ProMax: {
        key: 'ProMax',
        name: 'Pro Max',
        jobPostings: null,
        aiScores: null,
        jdWrites: 100,
        interviewQGen: 100,
        summaries: 1000,
        // monthly Rs 2000, yearly Rs 1600/mo rate billed as one lump sum (Rs 19200/yr), both +18% GST
        billingCycles: {
            monthly: buildCycle(2000, 30),
            yearly: buildCycle(1600 * 12, 365),
        },
        features: [
            'Unlimited active job postings',
            'Unlimited AI-scored applicants',
            'Proctored tests included',
            '100 AI job-description drafts per month',
            '100 AI interview-question generations per month',
            '1000 AI candidate summaries per month',
        ],
    },
}

// figure out which Recruiter plan the account is REALLY on sir — an expired Pro/ProMax is just
// a Basic again, same "effective plan" idea as utils/Plans.js's getEffectivePlan, kept as an
// entirely separate function so the two can never be confused for one another.
const getEffectiveRecruiterPlan = (user) => {
    if (
        user.recruiterPlan &&
        RECRUITER_PLANS[user.recruiterPlan] &&
        user.recruiterPlan !== 'Basic' &&
        user.recruiterPlanExpiresAt &&
        user.recruiterPlanExpiresAt > new Date()
    ) {
        return RECRUITER_PLANS[user.recruiterPlan]
    }
    return RECRUITER_PLANS.Basic
}

const CYCLE_DAYS = 30
const CYCLE_MS = CYCLE_DAYS * 24 * 60 * 60 * 1000

// lazy rolling monthly reset sir — checked/applied the moment a limit is actually consulted,
// no cron needed. First-ever check seeds recruiterCycleStart rather than resetting anything (a
// brand new Recruiter has nothing to reset). Uses an atomic conditional update matched against
// the CYCLE START VALUE JUST READ, so two concurrent requests racing the exact rollover instant
// can't both apply the reset and double-decrement each other's writes — same discipline as this
// app's other atomic counter resets.
const resetRecruiterCycleIfNeeded = async (user) => {
    if (!user.recruiterCycleStart) {
        await User.findOneAndUpdate(
            { _id: user._id, recruiterCycleStart: user.recruiterCycleStart },
            { $set: { recruiterCycleStart: new Date() } }
        )
        return
    }

    const elapsed = Date.now() - new Date(user.recruiterCycleStart).getTime()
    if (elapsed < CYCLE_MS) return

    await User.findOneAndUpdate(
        { _id: user._id, recruiterCycleStart: user.recruiterCycleStart },
        {
            $set: {
                recruiterCycleStart: new Date(),
                recruiterJobPostingsUsed: 0,
                recruiterAiScoresUsed: 0,
                recruiterJdWritesUsed: 0,
                recruiterInterviewQGenUsed: 0,
                recruiterSummariesUsed: 0,
            },
        }
    )
}

// loads the user, applies a lazy cycle reset if due, and returns { plan, user } sir — the one
// entry point every consume* helper below starts from
const loadRecruiterPlanState = async (userId) => {
    const user = await User.findById(userId)
    if (!user) return null
    await resetRecruiterCycleIfNeeded(user)
    // re-read sir — the reset above may have just zeroed the counters this same instant
    const fresh = await User.findById(userId)
    return { plan: getEffectiveRecruiterPlan(fresh), user: fresh }
}

// one shared atomic consume helper sir — `limitField` is the RECRUITER_PLANS key (e.g.
// 'jobPostings'), `usedField` is the matching User schema counter (e.g.
// 'recruiterJobPostingsUsed'). null limit means unlimited: still counted for stats, never
// blocked, same convention as utils/Plans.js's consumeCredit.
const consumeRecruiterLimit = async (userId, limitField, usedField, label) => {
    const state = await loadRecruiterPlanState(userId)
    if (!state) return { ok: false, message: 'User not found, please log in again' }

    const limit = state.plan[limitField]

    if (limit === null) {
        await User.findByIdAndUpdate(userId, { $inc: { [usedField]: 1 } })
        return { ok: true, plan: state.plan.key }
    }

    const updated = await User.findOneAndUpdate(
        { _id: userId, [usedField]: { $lt: limit } },
        { $inc: { [usedField]: 1 } },
        { returnDocument: 'after' }
    )

    if (updated) {
        return { ok: true, plan: state.plan.key }
    }

    return {
        ok: false,
        plan: state.plan.key,
        message: `You've used all ${limit} ${label} included in your ${state.plan.name} plan this month${
            state.plan.key === 'ProMax' ? '' : ' — upgrade for a higher limit'
        }`,
        code: state.plan.key === 'ProMax' ? 'LIMIT_RENEWS' : 'UPGRADE_AVAILABLE',
    }
}

// hands back a consumed unit sir — mirrors utils/Plans.js's refundCredit, for the same reason:
// an action that consumed its quota and then failed downstream shouldn't have actually cost
// anything. Never drops below zero.
const refundRecruiterLimit = async (userId, usedField) => {
    try {
        await User.findOneAndUpdate(
            { _id: userId, [usedField]: { $gt: 0 } },
            { $inc: { [usedField]: -1 } }
        )
    } catch (err) {
        logger.error('failed to refund recruiter plan usage', { err, userId, usedField })
    }
}

const consumeJobPosting = (userId) => consumeRecruiterLimit(userId, 'jobPostings', 'recruiterJobPostingsUsed', 'active job postings')
const consumeAiScore = (userId) => consumeRecruiterLimit(userId, 'aiScores', 'recruiterAiScoresUsed', 'AI-scored applicants')
const consumeJdWrite = (userId) => consumeRecruiterLimit(userId, 'jdWrites', 'recruiterJdWritesUsed', 'AI job-description drafts')
const consumeInterviewQGen = (userId) => consumeRecruiterLimit(userId, 'interviewQGen', 'recruiterInterviewQGenUsed', 'AI interview-question generations')
const consumeSummary = (userId) => consumeRecruiterLimit(userId, 'summaries', 'recruiterSummariesUsed', 'AI candidate summaries')

const refundJobPosting = (userId) => refundRecruiterLimit(userId, 'recruiterJobPostingsUsed')
const refundAiScore = (userId) => refundRecruiterLimit(userId, 'recruiterAiScoresUsed')
const refundJdWrite = (userId) => refundRecruiterLimit(userId, 'recruiterJdWritesUsed')
const refundInterviewQGen = (userId) => refundRecruiterLimit(userId, 'recruiterInterviewQGenUsed')
const refundSummary = (userId) => refundRecruiterLimit(userId, 'recruiterSummariesUsed')

module.exports = {
    RECRUITER_PLANS,
    getEffectiveRecruiterPlan,
    loadRecruiterPlanState,
    resetRecruiterCycleIfNeeded,
    consumeJobPosting,
    consumeAiScore,
    consumeJdWrite,
    consumeInterviewQGen,
    consumeSummary,
    refundJobPosting,
    refundAiScore,
    refundJdWrite,
    refundInterviewQGen,
    refundSummary,
}
