// The background worker process sir — every scheduled job runs HERE, not in the API server.
//
// WHY THIS EXISTS: index.js used to call startStreakCron(), startAccountPurgeCron() and five
// others directly, so the web process was doing two unrelated jobs at once. That has three
// consequences, in increasing order of seriousness:
//
//   1. Job CPU competes with request serving. The account purge sweep and the admin digest both
//      do unbounded collection scans and send email; on a small Render dyno that latency lands on
//      whichever user is unlucky enough to be mid-request.
//   2. You cannot scale the two independently. Scaling the API to two instances for traffic also
//      duplicates every cron, which is why utils/jobLease.js had to exist at all.
//   3. A crash in a job and a crash in the API are the same crash. They should not share a fate.
//
// The lease in utils/jobLease.js is still used and still correct — it is what makes running MORE
// THAN ONE worker safe, and it covers the rolling-deploy window where an old and new worker
// briefly overlap. But it is no longer load-bearing for the common case, because the normal
// deployment is exactly one worker.
//
// DEPLOYMENT sir: run `npm run worker` as a second process/service alongside `npm start`.
// If you run only the web process, no scheduled job will fire at all — that is deliberate and
// explicit, rather than the previous behaviour where jobs silently rode along with whichever
// web instance happened to win a lease.

require('dotenv').config({ quiet: true })

if (process.env.NODE_ENV !== 'test') {
    require('./utils/checkRequiredEnv')()
}

const mongoose = require('mongoose')

const connectDB = require('./Installation/mongo')
const logger = require('./utils/logger')

const { startStreakCron } = require('./utils/StreakCron.js')
const { startAiCostAlertCron } = require('./utils/AiCostAlert.js')
const { startAccountPurgeCron } = require('./utils/AccountPurgeCron.js')
const { startFeatureFlagCron } = require('./utils/FeatureFlagCron.js')
const { startAdminDigestCron } = require('./utils/AdminDigestCron.js')
const { startSubscriptionReconcileCron } = require('./utils/SubscriptionReconcileCron.js')
const { startCreditReconcileCron } = require('./utils/CreditReconcileCron.js')
const { startJobExpiryCron } = require('./utils/JobExpiryCron.js')

// one list sir — adding a job means adding it here and nowhere else
const jobs = [
    startStreakCron,
    startAiCostAlertCron,
    startAccountPurgeCron,
    startFeatureFlagCron,
    startAdminDigestCron,
    startSubscriptionReconcileCron,
    startCreditReconcileCron,
    startJobExpiryCron,
]

const start = async () => {
    await connectDB()

    for (const startJob of jobs) startJob()

    logger.info('worker started', { jobs: jobs.length, env: process.env.NODE_ENV || 'development' })
}

// a scheduled job that throws outside its own handler must not silently kill the worker sir —
// scheduler.js already catches per-task errors, this is the last resort for anything else
process.on('unhandledRejection', (err) => {
    logger.error('worker unhandled rejection', { err })
})

// clean shutdown sir — Render/Railway send SIGTERM on redeploy. Closing the Mongo connection
// lets any in-flight job's lease be released rather than waiting out its expiry.
const shutdown = async (signal) => {
    logger.info('worker shutting down', { signal })
    try {
        await mongoose.connection.close()
    } catch (err) {
        logger.error('error closing database connection during shutdown', { err })
    }
    process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

if (process.env.NODE_ENV !== 'test') {
    start().catch((err) => {
        logger.error('worker failed to start', { err })
        process.exit(1)
    })
}

module.exports = { jobs, start }
