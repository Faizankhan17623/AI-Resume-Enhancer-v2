// Interview proposal expiry sir.
//
// A proposal has proposalExpiresAt = now+48h the moment it's created (controllers/Interview.js's
// scheduleInterview). Nothing flips it automatically when that window passes with no slot ever
// confirmed — it would just sit at 'proposed' forever, blocking the recruiter from proposing a
// fresh set of times (scheduleInterview refuses to create a second active proposal while one is
// still 'proposed'). Same "make the stored state agree with the effective state" idea as
// TestInviteExpiryCron.js.
//
// Idempotent by construction sir: the query only matches 'proposed' rows with a past
// proposalExpiresAt, and the update sets exactly status:'expired', so a second run matches
// nothing.

const InterviewSchedule = require('../Models/InterviewSchedule')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

/**
 * Flips every proposed interview whose 48-hour confirmation window passed with no slot chosen.
 * Exported separately from the schedule so it can be tested and run on demand.
 *
 * @returns {Promise<number>} how many proposals were flipped
 */
const expireStaleInterviewProposals = async () => {
    const now = new Date()

    const result = await InterviewSchedule.updateMany(
        {
            status: 'proposed',
            proposalExpiresAt: { $lt: now },
        },
        { $set: { status: 'expired' } }
    )

    const expired = result.modifiedCount || 0
    if (expired > 0) {
        logger.info('expired stale interview proposals', { expired })
    }
    return expired
}

// hourly sir — same cadence as TestInviteExpiryCron/JobExpiryCron, a 48-hour window isn't
// something anyone is watching to the minute
const startInterviewScheduleExpiryCron = () => {
    scheduleJob({
        name: 'interview-schedule-expiry',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: expireStaleInterviewProposals,
    })
}

module.exports = { expireStaleInterviewProposals, startInterviewScheduleExpiryCron }
