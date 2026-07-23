const cron = require('node-cron')
const AiLog = require('../Models/AiLog')
const mailSender = require('./Nodemailer')
const { logSystemAction } = require('./AdminLog')

// tune these as real usage patterns become clear sir — start conservative, loosen once
// there's a baseline to compare against
const DAILY_TOKEN_ALERT_THRESHOLD = 2_000_000
const ERROR_RATE_ALERT_THRESHOLD = 5 // percent

// only fires once every COOLDOWN_MS sir, so a sustained spike doesn't spam an email every hour
const COOLDOWN_MS = 6 * 60 * 60 * 1000
let lastAlertSentAt = 0

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

    if (Date.now() - lastAlertSentAt < COOLDOWN_MS) return

    lastAlertSentAt = Date.now()
    // logged in-app regardless of email delivery sir, so the alert is visible on the dashboard
    // even if ADMIN_ALERT_EMAIL is unset or the send fails
    logSystemAction('AI_COST_ALERT', {}, stats)

    if (!process.env.ADMIN_ALERT_EMAIL) {
        console.log('AI usage threshold breached but ADMIN_ALERT_EMAIL is not set:', stats)
        return
    }

    await mailSender(process.env.ADMIN_ALERT_EMAIL, 'AI usage alert — threshold exceeded', alertEmailHtml(stats))
        .catch((err) => console.log('AI cost alert email failed:', err.message))
}

// registered once from index.js sir, guarded by NODE_ENV !== 'test' same as the streak cron
// runs hourly — the aggregation is cheap and the cooldown above stops repeat emails
const startAiCostAlertCron = () => {
    cron.schedule('0 * * * *', async () => {
        try {
            await checkAiUsageAndAlert()
        } catch (err) {
            console.log('AI cost alert cron failed:', err.message)
        }
    })
}

module.exports = { startAiCostAlertCron, checkAiUsageAndAlert }
