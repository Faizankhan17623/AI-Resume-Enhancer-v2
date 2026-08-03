// Subscription expiry reconciliation sir.
//
// THE PROBLEM: expiry was purely a READ-TIME concept. utils/Plans.js#getEffectivePlan correctly
// treats an expired Pro as Basic, but nothing ever wrote that conclusion back. So an expired
// subscriber kept `Subscription: true, SubType: 'Pro'` in the database forever, which meant:
//
//   - the admin dashboard counted them as an active paying customer (it queries SubType +
//     SubscriptionExpires > now for the revenue numbers, but the raw user list and every other
//     `SubType` read showed 'Pro')
//   - publicUser() returned SubType: 'Pro', which the frontend stores in localStorage and renders
//     as the user's current plan — so a lapsed user was told they were still on Pro
//   - `count` (credits used) was only reset on PURCHASE, so a lapsed user carried their spent
//     Pro credits into Basic and could be locked out of the free tier entirely
//
// THE FIX: a job that finds every user whose paid plan has expired and writes the demotion back,
// so the stored state matches the effective state. getEffectivePlan remains the authority at read
// time (this job runs hourly, not continuously) — this makes the DB agree with it rather than
// replacing it.
//
// Idempotent by construction sir: the query only matches users still marked as subscribed with a
// past expiry, and the update clears exactly those fields, so a second run matches nothing.

const User = require('../Models/User')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

/**
 * Demotes every user whose paid subscription has lapsed.
 * Exported separately from the schedule so it can be tested and run on demand.
 *
 * @returns {Promise<number>} how many users were demoted
 */
const reconcileExpiredSubscriptions = async () => {
    const now = new Date()

    const result = await User.updateMany(
        {
            Subscription: true,
            SubscriptionExpires: { $ne: null, $lt: now },
        },
        {
            $set: {
                Subscription: false,
                SubType: 'Basic',
                SubscriptionExpires: null,
                // credits reset on the way DOWN too sir — mirroring the reset on purchase.
                // Without this a user who spent 100 Pro credits would land on Basic already
                // past its 5-credit ceiling and be unable to use the free tier at all.
                count: 0,
            },
        }
    )

    const demoted = result.modifiedCount || 0
    if (demoted > 0) {
        logger.info('reconciled expired subscriptions', { demoted })
    }
    return demoted
}

// hourly sir — expiry is a date, not a moment anyone watches, and getEffectivePlan already gives
// exact read-time correctness in between runs. This only has to keep the stored state honest.
const startSubscriptionReconcileCron = () => {
    scheduleJob({
        name: 'subscription-reconcile',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: reconcileExpiredSubscriptions,
    })
}

module.exports = { reconcileExpiredSubscriptions, startSubscriptionReconcileCron }
