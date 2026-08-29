// Test invite expiry sir.
//
// An invited candidate has testInviteExpiresAt = now+5h the moment they're invited
// (controllers/Job.js's inviteApplicantToTest / bulkInviteApplicantsToTest). Nothing flipped the
// application's status automatically when that window passed — it just sat at 'invited_to_test'
// forever, a dead end (the recruiter's "Invite to test" button only shows for 'applied', so
// there was no way back to inviting this candidate again). This job finds every application
// still 'invited_to_test' whose window has passed WITHOUT the candidate ever having started an
// attempt, and flips it to 'invite_expired' — same "make the stored state agree with the
// effective state" idea as JobExpiryCron.js/SubscriptionReconcileCron.js.
//
// Idempotent by construction sir: the query only matches 'invited_to_test' rows with a past
// testInviteExpiresAt and no linked testAttempt, and the update sets exactly
// status:'invite_expired', so a second run matches nothing.

const JobApplication = require('../Models/JobApplication')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

/**
 * Flips every invited-to-test application whose 5-hour window passed with no attempt started.
 * Exported separately from the schedule so it can be tested and run on demand.
 *
 * @returns {Promise<number>} how many applications were flipped
 */
const expireStaleTestInvites = async () => {
    const now = new Date()

    const result = await JobApplication.updateMany(
        {
            status: 'invited_to_test',
            testInviteExpiresAt: { $ne: null, $lt: now },
            testAttempt: null,
        },
        { $set: { status: 'invite_expired' } }
    )

    const expired = result.modifiedCount || 0
    if (expired > 0) {
        logger.info('expired stale test invites', { expired })
    }
    return expired
}

// hourly sir — same cadence as JobExpiryCron/SubscriptionReconcileCron, a 5-hour window isn't
// something anyone is watching to the minute
const startTestInviteExpiryCron = () => {
    scheduleJob({
        name: 'test-invite-expiry',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: expireStaleTestInvites,
    })
}

module.exports = { expireStaleTestInvites, startTestInviteExpiryCron }
