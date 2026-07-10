const cron = require('node-cron')
const User = require('../Models/User')
const Review = require('../Models/Review')
const mailSender = require('./Nodemailer')

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
}

module.exports = { startStreakCron }
