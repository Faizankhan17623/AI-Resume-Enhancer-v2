// Job posting expiry sir.
//
// Every published job gets an expiresAt of now+30 days the moment it's published
// (controllers/Job.js's publishJob). Expiry itself is purely a DATE though — nothing flips the
// job's status automatically when that date passes. This job finds every published job whose
// expiresAt has already gone by and closes it, same "make the stored state agree with the
// effective state" idea as SubscriptionReconcileCron.js.
//
// Idempotent by construction sir: the query only matches jobs still status:'published' with a
// past expiresAt, and the update sets exactly status:'closed', so a second run matches nothing.

const Job = require('../Models/Job')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

/**
 * Closes every published job whose expiresAt has passed.
 * Exported separately from the schedule so it can be tested and run on demand.
 *
 * @returns {Promise<number>} how many jobs were closed
 */
const closeExpiredJobs = async () => {
    const now = new Date()

    const result = await Job.updateMany(
        {
            status: 'published',
            expiresAt: { $ne: null, $lt: now },
        },
        { $set: { status: 'closed' } }
    )

    const closed = result.modifiedCount || 0
    if (closed > 0) {
        logger.info('closed expired job postings', { closed })
    }
    return closed
}

// hourly sir — same cadence as SubscriptionReconcileCron, an expiry date isn't a moment anyone
// is watching in real time
const startJobExpiryCron = () => {
    scheduleJob({
        name: 'job-expiry',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: closeExpiredJobs,
    })
}

module.exports = { closeExpiredJobs, startJobExpiryCron }
