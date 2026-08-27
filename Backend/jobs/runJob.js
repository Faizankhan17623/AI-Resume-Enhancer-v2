// Runs ONE scheduled job and exits sir.
//
// WHY THIS EXISTS: worker.js is a long-lived process, which on Render means a paid Background
// Worker. This runner is the free alternative: an external scheduler (GitHub Actions,
// cron-job.org, or your own machine) invokes a single job, it does its work, and exits.
//
//   node jobs/runJob.js subscription-reconcile
//
// The job names and their task functions match worker.js exactly, so both deployment styles run
// identical code and neither can drift from the other.
//
// The lease from utils/jobLease.js is still applied, which means this is safe to run even while a
// real worker is also running: whichever process acquires the lease does the work and the other
// skips. An accidental double-trigger is therefore a no-op rather than a duplicate email.
//
// Exits 0 on success, 1 on failure, so a scheduler can alert on a red run.

require('dotenv').config({ quiet: true })

const mongoose = require('mongoose')

const connectDB = require('../Installation/mongo')
const logger = require('../utils/logger')
const { runWithLease } = require('../utils/jobLease')

const {
    sendWeeklyDigest,
    sendStreakBreakNudges,
    sendWinBackNudges,
    sendMonthlyHealthCheck,
    sendInterviewPrepNudges,
} = require('../utils/StreakCron')
const { checkAiUsageAndAlert } = require('../utils/AiCostAlert')
const { purgeExpiredAccounts } = require('../utils/AccountPurgeCron')
const { reEnableDueFlags } = require('../utils/FeatureFlagCron')
const { sendWeeklyAdminDigest } = require('../utils/AdminDigestCron')
const { reconcileExpiredSubscriptions } = require('../utils/SubscriptionReconcileCron')
const { reconcileOrphanedCreditSpends } = require('../utils/CreditReconcileCron')
const { closeExpiredJobs } = require('../utils/JobExpiryCron')

// the same jobs worker.js schedules sir. `leaseMs` must comfortably exceed the job's realistic
// runtime while staying well under its interval.
const JOBS = {
    'streak-nudges': {
        leaseMs: 10 * 60 * 1000,
        task: async () => {
            await sendStreakBreakNudges()
            await sendWinBackNudges()
        },
    },
    'weekly-digest': { leaseMs: 15 * 60 * 1000, task: sendWeeklyDigest },
    'monthly-health-check': { leaseMs: 15 * 60 * 1000, task: sendMonthlyHealthCheck },
    'interview-prep-nudges': { leaseMs: 10 * 60 * 1000, task: sendInterviewPrepNudges },
    'ai-cost-alert': { leaseMs: 5 * 60 * 1000, task: checkAiUsageAndAlert },
    'account-purge': { leaseMs: 10 * 60 * 1000, task: purgeExpiredAccounts },
    'feature-flag-reenable': { leaseMs: 2 * 60 * 1000, task: reEnableDueFlags },
    'admin-weekly-digest': { leaseMs: 15 * 60 * 1000, task: sendWeeklyAdminDigest },
    'subscription-reconcile': { leaseMs: 5 * 60 * 1000, task: reconcileExpiredSubscriptions },
    'credit-reconcile': { leaseMs: 5 * 60 * 1000, task: reconcileOrphanedCreditSpends },
    'job-expiry': { leaseMs: 5 * 60 * 1000, task: closeExpiredJobs },
}

const main = async () => {
    const name = process.argv[2]

    if (!name || !JOBS[name]) {
        console.error(
            `Usage: node jobs/runJob.js <job>\n\nAvailable jobs:\n  ${Object.keys(JOBS).join('\n  ')}`
        )
        process.exit(1)
    }

    const { leaseMs, task } = JOBS[name]
    const startedAt = Date.now()

    await connectDB()

    const ran = await runWithLease(name, leaseMs, task)

    if (ran) {
        logger.info('job finished', { job: name, ms: Date.now() - startedAt })
    } else {
        // not necessarily an error sir: either another process held the lease, or the task threw
        // and runWithLease already logged it
        logger.info('job skipped or failed, see previous log lines', { job: name })
    }

    await mongoose.connection.close()
    process.exit(0)
}

main().catch(async (err) => {
    logger.error('job runner crashed', { err, job: process.argv[2] })
    try {
        await mongoose.connection.close()
    } catch {
        // connection already closing or closed sir
    }
    process.exit(1)
})
