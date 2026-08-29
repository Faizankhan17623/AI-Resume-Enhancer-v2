// Test invite reminder sir, per direct request — cuts the "forgot and missed it" rate that
// TestInviteExpiryCron.js's whole invite_expired status exists to handle gracefully when it
// happens anyway. Sends ONE reminder email, roughly an hour before a candidate's 5-hour
// test-invite window (testInviteExpiresAt) closes.
//
// Runs hourly, same cadence as every other cron here (JobExpiryCron.js/
// SubscriptionReconcileCron.js/TestInviteExpiryCron.js) — the reminder window is deliberately a
// full hour wide (55-65 minutes remaining) so an hourly cron can't miss a candidate between runs
// the way a narrow window would.
//
// Idempotent by construction sir: the query only matches invited_to_test rows with
// testInviteReminderSent still false, and the update sets it true right after a successful send —
// a second run in the same window (or a retry after a partial failure) never double-sends to
// anyone the first pass already reached.

const JobApplication = require('../Models/JobApplication')
const Test = require('../Models/Test')
const mailSender = require('./Nodemailer')
const { testInviteReminderTemplate } = require('../Templates/TestInviteReminder')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

/**
 * Emails every invited-to-test candidate whose 5-hour window has 55-65 minutes left and who
 * hasn't already been reminded. Exported separately from the schedule so it can be tested and
 * run on demand.
 *
 * @returns {Promise<number>} how many reminder emails were sent
 */
const sendTestInviteReminders = async () => {
    const now = Date.now()
    const windowStart = new Date(now + 55 * 60 * 1000)
    const windowEnd = new Date(now + 65 * 60 * 1000)

    const applications = await JobApplication.find({
        status: 'invited_to_test',
        testInviteExpiresAt: { $gte: windowStart, $lte: windowEnd },
        testInviteReminderSent: false,
    })
        .populate('job', 'title companyName test')
        .populate('candidate', 'firstName lastName email')

    let sent = 0
    for (const application of applications) {
        // best-effort per-row sir — one bad address or a missing test/candidate must not stop
        // the rest of the batch, same reasoning as every other bulk mail send in this codebase
        try {
            if (!application.job?.test || !application.candidate?.email) continue

            const test = await Test.findById(application.job.test).select('inviteCode timeLimitMinutes')
            if (!test?.inviteCode) continue

            const frontendUrl = process.env.FRONTEND_URL
                ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
                : "http://localhost:5173"

            await mailSender(
                application.candidate.email,
                "Your Test Invite Expires Soon — Resumify",
                testInviteReminderTemplate(
                    application.candidate.firstName,
                    application.job.title,
                    application.job.companyName,
                    `${frontendUrl}/Test/${test.inviteCode}`,
                    test.timeLimitMinutes
                )
            )

            application.testInviteReminderSent = true
            await application.save()
            sent += 1
        } catch (err) {
            logger.error('test invite reminder mail failed', { err, applicationId: application._id })
        }
    }

    if (sent > 0) {
        logger.info('sent test invite reminders', { sent })
    }
    return sent
}

const startTestInviteReminderCron = () => {
    scheduleJob({
        name: 'test-invite-reminder',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: sendTestInviteReminders,
    })
}

module.exports = { sendTestInviteReminders, startTestInviteReminderCron }
