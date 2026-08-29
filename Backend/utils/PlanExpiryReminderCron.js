// Plan-expiry reminder emails sir, per direct request — 7/3/1 days before a paid User plan
// (Pro/ProMax) expires, plus one more the day it actually expires, for both monthly and yearly
// billing alike (this only ever looks at SubscriptionExpires, which is set the same way
// regardless of which cycle was purchased — see controllers/Payment.js's activatePaidOrder).
//
// Runs hourly, same cadence as every other cron here (SubscriptionReconcileCron.js/
// JobExpiryCron.js/TestInviteReminderCron.js). SubscriptionReconcileCron.js is what actually
// demotes an expired user back to Basic — this cron only ever sends mail, never touches
// Subscription/SubType/SubscriptionExpires itself, so the two can safely run in either order
// within the same hourly tick.
//
// Idempotent by construction sir: each of the four milestones ('7'/'3'/'1'/'0') is sent at most
// once per SubscriptionExpires — `planExpiryRemindersSent` (Models/User.js) tracks which
// milestones have already gone out, and a fresh purchase resets it to [] (activatePaidOrder sets
// a new SubscriptionExpires at the same time), so the next cycle's reminders fire fresh.
//
// Milestone windows sir: a day-granularity milestone can't use a tight timestamp window the way
// TestInviteReminderCron.js's hour-granularity one does — "7 days before" just means "the day
// whose date is 7 calendar days before the expiry date", so this compares day counts (rounded)
// rather than a narrow millisecond range, and the sent-tracking array is what prevents an hourly
// cron from re-sending the same milestone repeatedly through that whole calendar day.

const User = require('../Models/User')
const mailSender = require('./Nodemailer')
const { planExpiryReminderTemplate } = require('../Templates/PlanExpiryReminder')
const { PLANS } = require('./Plans')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

const MILESTONES = [7, 3, 1, 0]
const MS_PER_DAY = 24 * 60 * 60 * 1000

const formatExpiry = (date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
// en-GB with these options renders e.g. "17 August 2026" sir — day, full month name, year, no commas

/**
 * Emails every Pro/ProMax user at the 7/3/1-days-before and day-of milestones for their
 * SubscriptionExpires, skipping any milestone already sent for the current expiry.
 * Exported separately from the schedule so it can be tested and run on demand.
 *
 * @returns {Promise<number>} how many reminder emails were sent
 */
const sendPlanExpiryReminders = async () => {
    const now = new Date()

    // candidates sir — any paid, not-yet-expired-by-more-than-a-day user (the day-of milestone
    // still needs to catch someone up to ~24h past the exact expiry instant, since this only
    // runs hourly and SubscriptionReconcileCron.js may not have demoted them in the same tick yet)
    const users = await User.find({
        Subscription: true,
        SubType: { $in: ['Pro', 'ProMax'] },
        SubscriptionExpires: { $ne: null, $gte: new Date(now.getTime() - MS_PER_DAY) },
    }).select('firstName email SubType SubscriptionExpires planExpiryRemindersSent')

    let sent = 0
    for (const user of users) {
        try {
            const daysLeft = Math.round((user.SubscriptionExpires.getTime() - now.getTime()) / MS_PER_DAY)
            const milestone = MILESTONES.find((m) => m === daysLeft)
            if (milestone === undefined) continue

            const key = String(milestone)
            if ((user.planExpiryRemindersSent || []).includes(key)) continue

            const planName = PLANS[user.SubType]?.name || user.SubType
            const frontendUrl = process.env.FRONTEND_URL
                ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
                : "http://localhost:5173"

            await mailSender(
                user.email,
                milestone === 0
                    ? `Your ${planName} plan has expired — Resumify`
                    : `Your ${planName} plan expires in ${milestone} day${milestone === 1 ? '' : 's'} — Resumify`,
                planExpiryReminderTemplate(
                    user.firstName,
                    planName,
                    milestone,
                    formatExpiry(user.SubscriptionExpires),
                    `${frontendUrl}/Pricing`
                )
            )

            // atomic push sir — $addToSet so a concurrent worker tick can't double-add the same
            // milestone even in a narrow race, same conditional-update discipline as the rest of
            // this app's cycle-reset code (utils/Plans.js's resetCreditCycleIfNeeded)
            await User.updateOne({ _id: user._id }, { $addToSet: { planExpiryRemindersSent: key } })
            sent += 1
        } catch (err) {
            logger.error('plan expiry reminder mail failed', { err, userId: user._id })
        }
    }

    if (sent > 0) {
        logger.info('sent plan expiry reminders', { sent })
    }
    return sent
}

const startPlanExpiryReminderCron = () => {
    scheduleJob({
        name: 'plan-expiry-reminder',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: sendPlanExpiryReminders,
    })
}

module.exports = { sendPlanExpiryReminders, startPlanExpiryReminderCron }
