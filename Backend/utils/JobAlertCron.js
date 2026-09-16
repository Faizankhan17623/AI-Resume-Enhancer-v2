// Job alert matching sir — checks every active saved alert against published jobs it hasn't
// already notified about, per direct request ("notify me when a matching job gets posted").
//
// Deliberately matches on notifiedJobs membership rather than a time window (e.g. "jobs created
// in the last hour") sir — a time window can silently skip a job if the cron run is late or the
// job's publish and creation timestamps drift apart (Job.js has no separate publishedAt field,
// see this file's own note). Checking "is this job's id already in notifiedJobs" is correct
// regardless of timing and trivially idempotent: a job already notified about is never
// re-matched, a second cron run in the same window changes nothing.
//
// Matching itself is deliberately simple sir — same "good enough, not over-engineered" instinct
// as Career.js's own match() helper: case-insensitive keyword containment against title +
// description + skills, plus optional location/employmentType filters. Not a real search index.

const JobAlert = require('../Models/JobAlert')
const Job = require('../Models/Job')
const mailSender = require('./Nodemailer')
const { notify } = require('./NotificationLog')
const { jobAlertMatchTemplate } = require('../Templates/JobAlertMatch')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const jobMatchesAlert = (job, alert) => {
    const re = new RegExp(escapeRegex(alert.keywords), 'i')
    const haystack = `${job.title} ${job.description} ${(job.skills || []).join(' ')}`
    if (!re.test(haystack)) return false

    if (alert.location && !job.location?.toLowerCase().includes(alert.location.toLowerCase())) return false
    if (alert.employmentType && job.employmentType !== alert.employmentType) return false

    return true
}

/**
 * Checks every active job alert against currently-published jobs, emails a digest of any new
 * matches, and records them in notifiedJobs so they're never re-sent. Exported separately from
 * the schedule so it can be tested and run on demand.
 *
 * @returns {Promise<number>} how many alerts had at least one new match emailed
 */
const checkJobAlerts = async () => {
    const [alerts, publishedJobs] = await Promise.all([
        JobAlert.find({ active: true }).populate('user', 'firstName lastName email'),
        Job.find({ status: 'published' }).select('title companyName description location employmentType skills'),
    ])

    let alertsNotified = 0

    for (const alert of alerts) {
        if (!alert.user?.email) continue // deleted account sir, skip silently

        const notifiedSet = new Set(alert.notifiedJobs.map((id) => id.toString()))
        const newMatches = publishedJobs.filter((job) => !notifiedSet.has(job._id.toString()) && jobMatchesAlert(job, alert))

        if (newMatches.length === 0) {
            alert.lastCheckedAt = new Date()
            await alert.save()
            continue
        }

        try {
            await mailSender(
                alert.user.email,
                `New job matches for "${alert.keywords}" — Resumify`,
                jobAlertMatchTemplate(
                    alert.user.firstName,
                    alert.keywords,
                    newMatches.map((j) => ({ title: j.title, companyName: j.companyName, location: j.location })),
                    `${frontendOrigin()}/Jobs`
                )
            )
            notify({
                user: alert.user._id,
                type: 'system',
                title: 'New job matches',
                message: `${newMatches.length} new job${newMatches.length > 1 ? 's' : ''} matching "${alert.keywords}"`,
                link: '/Jobs',
            })
            alertsNotified += 1
        } catch (mailError) {
            logger.error('job alert email failed', { err: mailError, alertId: alert._id })
            // don't mark these jobs notified sir — a failed send should be retried next run,
            // not silently swallowed
            continue
        }

        alert.notifiedJobs.push(...newMatches.map((j) => j._id))
        alert.lastCheckedAt = new Date()
        await alert.save()
    }

    if (alertsNotified > 0) {
        logger.info('job alerts notified', { alertsNotified })
    }
    return alertsNotified
}

// hourly sir — same cadence as most crons in this app; a job posting isn't time-critical enough
// to need anything tighter
const startJobAlertCron = () => {
    scheduleJob({
        name: 'job-alert-check',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: checkJobAlerts,
    })
}

module.exports = { checkJobAlerts, startJobAlertCron }
