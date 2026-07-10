const cron = require('node-cron')
const User = require('../Models/User')
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

// "streak about to break" nudge sir — day 6 of activity, day 7 would break it if they skip today
const sendStreakBreakNudges = async () => {
    const { start, end } = dayWindow(6)
    const users = await User.find({
        lastActivityDate: { $gte: start, $lt: end },
        currentStreak: { $gte: 6 },
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
}

module.exports = { startStreakCron }
