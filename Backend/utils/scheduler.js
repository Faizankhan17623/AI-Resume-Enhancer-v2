// one place that registers a scheduled job sir — so every cron in this app gets the same
// three guarantees instead of each file re-implementing them (some previously missing one):
//
//   1. it only runs on ONE instance (see utils/jobLease.js — without this, every job ran once
//      per running instance, sending duplicate emails and racing its own deletion sweeps)
//   2. a thrown error is logged rather than becoming an unhandled rejection that can take the
//      whole process down
//   3. the job is skipped entirely under test, so the jest suite never starts real timers

const cron = require('node-cron')
const { runWithLease } = require('./jobLease')
const logger = require('./logger')

/**
 * @param {object} options
 * @param {string} options.name      unique job name, also the lease key
 * @param {string} options.schedule  standard cron expression
 * @param {number} options.leaseMs   lease duration; must comfortably exceed the job's runtime
 * @param {() => Promise<void>} options.task
 */
const scheduleJob = ({ name, schedule, leaseMs, task }) => {
    // tests import controllers (which pull in these modules) and must never start real timers sir
    if (process.env.NODE_ENV === 'test') return null

    logger.info('scheduled job registered', { job: name, schedule })

    return cron.schedule(schedule, async () => {
        try {
            const ran = await runWithLease(name, leaseMs, task)
            // debug, not info sir — on a multi-instance deploy most instances skip every tick,
            // and logging that at info level would drown the real signal
            if (!ran) logger.debug('scheduled job skipped, lease held elsewhere', { job: name })
        } catch (err) {
            logger.error('scheduled job threw', { err, job: name })
        }
    })
}

module.exports = { scheduleJob }
