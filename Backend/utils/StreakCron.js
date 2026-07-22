const cron = require('node-cron')
const User = require('../Models/User')
const Review = require('../Models/Review')
const Resume = require('../Models/Resume')
const mailSender = require('./Nodemailer')
const { notify } = require('./NotificationLog')

// day-window helper sir — returns [startOfDay, endOfDay] N days ago, in UTC, so the query
// catches exactly "N days ago" regardless of what time the cron actually runs
const dayWindow = (daysAgo) => {
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - daysAgo)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)
    return { start, end }
}

const streakBreakEmailHtml = (name, streak) => `
    <div style="font-family: sans-serif;">
        <h2>Don't lose your ${streak}-day streak, ${name}!</h2>
        <p>You haven't used AI Resume Enhancer today. Do one quick review to keep your streak alive.</p>
    </div>
`

const winBackEmailHtml = (name) => `
    <div style="font-family: sans-serif;">
        <h2>We miss you, ${name}!</h2>
        <p>It's been a couple weeks since your last resume review. Come back and see how your score has room to grow.</p>
    </div>
`

const digestEmailHtml = (name, { count, bestScore, latestScore, improvement }) => `
    <div style="font-family: sans-serif;">
        <h2>Your week on AI Resume Enhancer, ${name}</h2>
        <p>Here's how your resume did this week:</p>
        <ul>
            <li><strong>${count}</strong> review${count === 1 ? '' : 's'} run</li>
            <li>Best score: <strong>${bestScore}</strong>/100</li>
            <li>Latest score: <strong>${latestScore}</strong>/100</li>
            <li>Change since your first review this week: <strong>${improvement >= 0 ? '+' : ''}${improvement}</strong></li>
        </ul>
        <p>Keep iterating — every review gets you closer to an interview.</p>
    </div>
`

const healthCheckEmailHtml = (name, { label, score, topIssue }) => `
    <div style="font-family: sans-serif;">
        <h2>Monthly resume health check, ${name}</h2>
        <p>Here's how <strong>${label}</strong> is doing on ATS formatting:</p>
        <p style="font-size:28px;font-weight:bold;margin:12px 0;">${score}/100</p>
        ${topIssue
            ? `<p><strong>Top thing to fix:</strong> ${topIssue}</p>`
            : `<p>No formatting issues detected — nice work.</p>`
        }
        <p>Log in any time to re-scan or run a fresh ATS review against a new job description.</p>
    </div>
`

// weekly summary of review activity sir — only to users who actually ran a review in the last 7 days,
// a quiet user gets nothing here (that's what the win-back nudge below is for)
const sendWeeklyDigest = async () => {
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - 7)

    const reviews = await Review.find({ createdAt: { $gte: since } })
        .select('user atsScore createdAt')
        .sort({ createdAt: 1 })

    if (!reviews.length) return

    // group by user sir — oldest to newest so first/last land correctly
    const byUser = new Map()
    for (const r of reviews) {
        const key = String(r.user)
        if (!byUser.has(key)) byUser.set(key, [])
        byUser.get(key).push(r.atsScore)
    }

    const users = await User.find({ _id: { $in: [...byUser.keys()] }, notifyDigest: true }).select('email firstName')

    for (const user of users) {
        const scores = byUser.get(String(user._id)) || []
        if (!scores.length) continue
        const stats = {
            count: scores.length,
            bestScore: Math.max(...scores),
            latestScore: scores[scores.length - 1],
            improvement: scores[scores.length - 1] - scores[0],
        }
        mailSender(user.email, 'Your weekly resume review digest', digestEmailHtml(user.firstName, stats))
            .catch((err) => console.log('weekly digest email failed:', err.message))
        notify({
            user: user._id,
            type: 'digest',
            title: 'Your weekly resume review digest',
            message: `${stats.count} review${stats.count === 1 ? '' : 's'} this week, latest score ${stats.latestScore}/100.`,
            link: '/Dashboard/History',
        })
    }
}

// "streak about to break" nudge sir — day 6 of activity, day 7 would break it if they skip today
const sendStreakBreakNudges = async () => {
    const { start, end } = dayWindow(6)
    const users = await User.find({
        lastActivityDate: { $gte: start, $lt: end },
        currentStreak: { $gte: 6 },
        notifyStreak: true,
    }).select('email firstName currentStreak')

    for (const user of users) {
        mailSender(user.email, 'Your streak is about to end', streakBreakEmailHtml(user.firstName, user.currentStreak))
            .catch((err) => console.log('streak-break email failed:', err.message))
        notify({
            user: user._id,
            type: 'streak-break',
            title: `Don't lose your ${user.currentStreak}-day streak!`,
            message: 'You haven\'t used AI Resume Enhancer today. Do one quick review to keep it alive.',
            link: '/Dashboard/New-Review',
        })
    }
}

// win-back nudge sir — no activity in 14 days
const sendWinBackNudges = async () => {
    const { start, end } = dayWindow(14)
    const users = await User.find({
        lastActivityDate: { $gte: start, $lt: end },
        notifyWinBack: true,
    }).select('email firstName')

    for (const user of users) {
        mailSender(user.email, 'We miss you at AI Resume Enhancer', winBackEmailHtml(user.firstName))
            .catch((err) => console.log('win-back email failed:', err.message))
        notify({
            user: user._id,
            type: 'win-back',
            title: 'We miss you!',
            message: 'It\'s been a couple weeks since your last resume review. Come back and see how your score has room to grow.',
            link: '/Dashboard/New-Review',
        })
    }
}

// monthly resume health check sir — re-surfaces the STORED formattingCheck (from Resume.js,
// computed once at upload time) for each user's default resume. Deliberately no fresh AI call
// and no JD needed here: it's a free, deterministic nudge, not a full re-review.
const sendMonthlyHealthCheck = async () => {
    const defaults = await Resume.find({ isDefault: true, 'formattingCheck.score': { $ne: null } })
        .select('user label originalFilename formattingCheck')

    if (!defaults.length) return

    const users = await User.find({
        _id: { $in: defaults.map((r) => r.user) },
        notifyHealthCheck: true,
    }).select('email firstName')
    const usersById = new Map(users.map((u) => [String(u._id), u]))

    for (const resume of defaults) {
        const user = usersById.get(String(resume.user))
        if (!user) continue

        const topIssue = resume.formattingCheck.issues?.[0]?.message || null
        mailSender(
            user.email,
            'Your monthly resume health check',
            healthCheckEmailHtml(user.firstName, {
                label: resume.label || resume.originalFilename || 'your resume',
                score: resume.formattingCheck.score,
                topIssue,
            })
        ).catch((err) => console.log('health-check email failed:', err.message))
        notify({
            user: user._id,
            type: 'health-check',
            title: 'Your monthly resume health check',
            message: `${resume.label || resume.originalFilename || 'Your resume'} scored ${resume.formattingCheck.score}/100 on ATS formatting.`,
            link: '/Dashboard/Resumes',
        })
    }
}

// registered once from index.js sir, guarded by NODE_ENV !== 'test' same as connectDB()/app.listen
// runs once a day at 09:00 UTC
const startStreakCron = () => {
    cron.schedule('0 9 * * *', async () => {
        try {
            await sendStreakBreakNudges()
            await sendWinBackNudges()
        } catch (err) {
            console.log('streak cron failed:', err.message)
        }
    })

    // weekly digest sir — Monday 08:00 UTC, once a week so it never competes with the daily nudges above
    cron.schedule('0 8 * * 1', async () => {
        try {
            await sendWeeklyDigest()
        } catch (err) {
            console.log('weekly digest cron failed:', err.message)
        }
    })

    // monthly health check sir — 1st of the month, 08:00 UTC
    cron.schedule('0 8 1 * *', async () => {
        try {
            await sendMonthlyHealthCheck()
        } catch (err) {
            console.log('health-check cron failed:', err.message)
        }
    })
}

module.exports = { startStreakCron }
