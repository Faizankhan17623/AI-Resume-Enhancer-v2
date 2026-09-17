const User = require('../Models/User')
const AuditLog = require('../Models/AuditLog')
const AiLog = require('../Models/AiLog')
const LoginLog = require('../Models/LoginLog')
const mailSender = require('./Nodemailer')
const { adminDigestTemplate } = require('../Templates/adminDigestTemplate')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

const formatDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// cohort/retention numbers for the week sir, per direct request — reuses data every one of
// these models already collects for other purposes, no new tracking added.
//
// "review completion rate" is a TECHNICAL success rate (did the Groq call for a review attempt
// actually complete), not a UI funnel ("started the form but never submitted") — that funnel
// event doesn't exist anywhere in this app (CreditSpend rows are deleted once resolved, so
// they can't be queried retroactively for a past week), and building one just for this digest
// would be a much bigger change than what was asked for. AiLog{type:'review'} is the closest
// real signal: every review attempt logs a row here, success:false on a Groq failure.
const getRetentionStats = async (weekStart, weekEnd) => {
    // NOTE on churn sir: utils/SubscriptionReconcileCron.js WIPES SubscriptionExpires back to
    // null the moment it demotes an expired Pro/ProMax user to Basic (see that file's own
    // update: { Subscription: false, SubType: 'Basic', SubscriptionExpires: null }), and it
    // doesn't write an AuditLog entry either. That means there is genuinely no stored record of
    // WHEN a downgrade happened once it's processed — the field that would answer "did this
    // user's plan lapse this week" is gone by the time this digest runs. Rather than query
    // something that would silently return 0 forever, churn here is approximated as "still on a
    // paid plan a month ago, going by account age, but inactive now" — an honest proxy, not a
    // real subscription-lapse count. A real fix would mean logging a PLAN_CHANGE-style AuditLog
    // row from SubscriptionReconcileCron.js itself — worth doing later, out of scope here.
    const [wauAgg, reviewAgg, inactiveCount] = await Promise.all([
        // distinct users with a successful login this week sir — LoginLog's own purpose
        LoginLog.distinct('user', { createdAt: { $gte: weekStart, $lt: weekEnd } }),
        AiLog.aggregate([
            { $match: { type: 'review', createdAt: { $gte: weekStart, $lt: weekEnd } } },
            { $group: { _id: '$success', count: { $sum: 1 } } },
        ]),
        // signed up more than 30 days ago and hasn't touched the app in 30+ days sir — a coarse
        // "at risk of churning" count, not a hard churn definition (see note above)
        User.countDocuments({
            role: 'User',
            createdAt: { $lt: new Date(weekEnd.getTime() - 30 * 24 * 60 * 60 * 1000) },
            lastActivityDate: { $lt: new Date(weekEnd.getTime() - 30 * 24 * 60 * 60 * 1000) },
        }),
    ])

    const reviewSucceeded = reviewAgg.find((r) => r._id === true)?.count || 0
    const reviewFailed = reviewAgg.find((r) => r._id === false)?.count || 0
    const reviewTotal = reviewSucceeded + reviewFailed

    return {
        weeklyActiveUsers: wauAgg.length,
        reviewCompletionRate: reviewTotal ? Number(((reviewSucceeded / reviewTotal) * 100).toFixed(1)) : null,
        reviewAttempts: reviewTotal,
        inactiveUsers: inactiveCount,
    }
}

// a passive audit-log-lite sir — most admins won't remember to check /Admin/Audit on their
// own, this pushes the same signal to their inbox once a week instead
const sendWeeklyAdminDigest = async () => {
    const weekEnd = new Date()
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [grouped, retention] = await Promise.all([
        AuditLog.aggregate([
            { $match: { createdAt: { $gte: weekStart, $lt: weekEnd } } },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        getRetentionStats(weekStart, weekEnd),
    ])

    const counts = grouped.map((g) => ({ action: g._id, count: g.count }))
    const totalActions = counts.reduce((sum, c) => sum + c.count, 0)

    const admins = await User.find({ role: 'Admin' }).select('email firstName')

    for (const admin of admins) {
        mailSender(
            admin.email,
            'Your Weekly Admin Digest — Resume Enhancer',
            adminDigestTemplate(admin.firstName, {
                counts,
                totalActions,
                retention,
                weekStart: formatDate(weekStart),
                weekEnd: formatDate(weekEnd),
            })
        ).catch((err) => logger.warn('admin digest email failed', { err, to: admin.email }))
    }
}

// registered once from index.js sir. Monday 09:00 UTC — after the streak/win-back crons (08:00)
// so it doesn't compete for the mail relay in the same minute. The lease stops every admin
// receiving one copy of this digest per running instance.
const startAdminDigestCron = () => {
    scheduleJob({
        name: 'admin-weekly-digest',
        schedule: '0 9 * * 1',
        leaseMs: 10 * 60 * 1000,
        task: sendWeeklyAdminDigest,
    })
}

module.exports = { startAdminDigestCron, sendWeeklyAdminDigest }
