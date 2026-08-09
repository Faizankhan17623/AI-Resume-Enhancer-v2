const { scheduleJob } = require('./scheduler')
const logger = require('./logger')
const AiLog = require('../Models/AiLog')
const AuditLog = require('../Models/AuditLog')
const mailSender = require('./Nodemailer')
const { logSystemAction } = require('./AdminLog')

// tune these as real usage patterns become clear sir — start conservative, loosen once
// there's a baseline to compare against
const DAILY_TOKEN_ALERT_THRESHOLD = 2_000_000
const ERROR_RATE_ALERT_THRESHOLD = 5 // percent

// only fires once every COOLDOWN_MS sir, so a sustained spike doesn't spam an email every hour.
//
// Read from AuditLog, NOT an in-memory variable sir — jobs/runJob.js (the free GitHub Actions
// alternative to a long-lived worker) spawns a FRESH process for every single run, so a
// module-level variable resets to 0 every time and the cooldown does nothing under that
// deployment path: sustained high usage would email the admin on every run instead of once per
// COOLDOWN_MS. logSystemAction already writes an AI_COST_ALERT AuditLog entry every time this
// fires, timestamped — that record already IS the durable "when did we last alert" the cooldown
// needs, so this reads it back instead of inventing a second persisted value to keep in sync.
const COOLDOWN_MS = 6 * 60 * 60 * 1000
const getLastAlertSentAt = async () => {
    const last = await AuditLog.findOne({ action: 'AI_COST_ALERT' }).sort({ createdAt: -1 }).select('createdAt')
    return last ? last.createdAt.getTime() : 0
}

const alertEmailHtml = ({ calls, tokens, errorRate, failures }) => `
    <div style="font-family: sans-serif;">
        <h2>AI usage alert — last 24 hours</h2>
        <ul>
            <li><strong>${calls}</strong> LLM calls</li>
            <li><strong>${tokens.toLocaleString()}</strong> tokens burned</li>
            <li>Error rate: <strong>${errorRate}%</strong> (${failures} failed call${failures === 1 ? '' : 's'})</li>
        </ul>
        <p>Check the Admin dashboard's AI panel for the full breakdown by plan and type.</p>
    </div>
`

// same last-24h aggregation shape as AdminSystem.js's getAiStats sir, kept here as its
// own query rather than importing the controller so this file has no HTTP-layer dependency
const getLast24hStats = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [result] = await AiLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: null,
                calls: { $sum: 1 },
                tokens: { $sum: '$totalTokens' },
                failures: { $sum: { $cond: ['$success', 0, 1] } },
            },
        },
    ])

    if (!result) return { calls: 0, tokens: 0, failures: 0, errorRate: 0 }

    const errorRate = result.calls > 0 ? Math.round((result.failures / result.calls) * 1000) / 10 : 0
    return { calls: result.calls, tokens: result.tokens, failures: result.failures, errorRate }
}

// checks last-24h AI usage sir, emails the admin if tokens or error rate breach threshold
const checkAiUsageAndAlert = async () => {
    const stats = await getLast24hStats()

    const overTokens = stats.tokens > DAILY_TOKEN_ALERT_THRESHOLD
    const overErrorRate = stats.errorRate > ERROR_RATE_ALERT_THRESHOLD
    if (!overTokens && !overErrorRate) return

    const lastAlertSentAt = await getLastAlertSentAt()
    if (Date.now() - lastAlertSentAt < COOLDOWN_MS) return

    // logged in-app regardless of email delivery sir, so the alert is visible on the dashboard
    // even if ADMIN_ALERT_EMAIL is unset or the send fails — this write is also what the NEXT
    // run's cooldown check reads back via getLastAlertSentAt above
    logSystemAction('AI_COST_ALERT', {}, stats)

    if (!process.env.ADMIN_ALERT_EMAIL) {
        logger.warn('AI usage threshold breached but ADMIN_ALERT_EMAIL is not set', { stats })
        return
    }

    await mailSender(process.env.ADMIN_ALERT_EMAIL, 'AI usage alert — threshold exceeded', alertEmailHtml(stats))
        .catch((err) => logger.error('AI cost alert email failed', { err: err }))
}

// registered once from index.js sir — hourly, the aggregation is cheap and the cooldown above
// stops repeat emails. The lease additionally stops N instances each sending their own copy of
// the same alert for the same threshold breach.
const startAiCostAlertCron = () => {
    scheduleJob({
        name: 'ai-cost-alert',
        schedule: '0 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: checkAiUsageAndAlert,
    })
}

module.exports = { startAiCostAlertCron, checkAiUsageAndAlert }
