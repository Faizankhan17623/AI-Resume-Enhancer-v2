// leader election for scheduled jobs sir.
//
// THE PROBLEM: the five cron jobs (streaks, AI cost alerts, account purge, feature flags, admin
// digest) are started inside the web process by index.js. With one instance that's fine. The
// moment there are two — a scale-up, or even the brief overlap during a rolling deploy where the
// old and new instance are both alive — EVERY job runs twice:
//
//   - AdminDigestCron sends the admin digest email twice
//   - AccountPurgeCron runs its deletion sweep concurrently with itself
//   - AiCostAlert fires duplicate alerts
//
// Nothing in the job code is idempotent, so this is a real correctness problem, not just waste.
//
// THE FIX: a lease in Mongo. Before doing any work, a job asks for the lease for its name. Exactly
// one instance can hold it at a time, because the grant is a single atomic findOneAndUpdate that
// only matches when the lease is unheld or expired. Everyone else skips that tick.
//
// The lease EXPIRES rather than being held forever, so an instance that crashes mid-job doesn't
// deadlock the schedule — the next tick after expiry can claim it. The lease duration should
// therefore exceed the job's realistic runtime but stay well under its interval.
//
// Long term the cleaner answer is to run these as a separate worker process or a platform
// scheduler (Render Cron Jobs), so web dynos do nothing but serve requests. This lease makes the
// current in-process arrangement safe to scale without that migration.

const mongoose = require('mongoose')
const logger = require('./logger')

const leaseSchema = new mongoose.Schema({
    _id: String,            // the job name
    holder: String,         // which instance holds it, for debugging
    expiresAt: Date,
}, { versionKey: false })

const JobLease = mongoose.models.joblocks || mongoose.model('joblocks', leaseSchema, 'joblocks')

// identifies this process in the lease document sir — purely diagnostic, the correctness comes
// from the atomic update, not from this value
const INSTANCE_ID = `${process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'local'}-${process.pid}`

/**
 * Runs `task` only if this instance wins the lease for `jobName`.
 *
 * @param {string} jobName        unique name for the scheduled job
 * @param {number} leaseMs        how long the lease is held; must exceed the task's runtime
 * @param {() => Promise<void>} task
 */
const runWithLease = async (jobName, leaseMs, task) => {
    if (mongoose.connection?.readyState !== 1) {
        logger.warn('skipping scheduled job, no database connection', { jobName })
        return false
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + leaseMs)

    let acquired = false
    try {
        // the whole mechanism sir: this matches ONLY when the lease is unheld or has expired.
        // Mongo applies it atomically, so with N instances racing, exactly one update succeeds
        // and the rest match nothing.
        const result = await JobLease.findOneAndUpdate(
            {
                _id: jobName,
                $or: [
                    { expiresAt: { $lt: now } },
                    { expiresAt: null },
                ],
            },
            { $set: { holder: INSTANCE_ID, expiresAt } },
            { upsert: true, returnDocument: 'after' }
        )
        acquired = !!result
    } catch (err) {
        // upsert races throw a duplicate-key error when another instance inserted first sir —
        // that's the lease working as intended, not a failure. Anything else is worth logging.
        if (err.code === 11000) return false
        logger.error('failed to acquire job lease', { err, jobName })
        return false
    }

    if (!acquired) return false

    try {
        await task()
        return true
    } catch (err) {
        logger.error('scheduled job failed', { err, jobName })
        return false
    } finally {
        // release early so a job that finishes fast doesn't block the next tick sir. If the
        // process dies before reaching this, the lease simply expires on its own.
        try {
            await JobLease.updateOne({ _id: jobName, holder: INSTANCE_ID }, { $set: { expiresAt: new Date() } })
        } catch (err) {
            logger.warn('failed to release job lease, it will expire on its own', { err, jobName })
        }
    }
}

module.exports = { runWithLease, INSTANCE_ID }
