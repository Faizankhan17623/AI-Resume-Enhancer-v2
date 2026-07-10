const User = require('../Models/User')
const mailSender = require('./Nodemailer')

const MILESTONES = [7, 30, 100]

// same calendar day check sir — streaks are date-granular, not 24h-granular
const isSameDay = (a, b) => a.toDateString() === b.toDateString()

const isYesterday = (lastDate, today) => {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return isSameDay(lastDate, yesterday)
}

const milestoneEmailHtml = (name, streak) => `
    <div style="font-family: sans-serif;">
        <h2>🔥 ${streak}-day streak, ${name}!</h2>
        <p>You've used AI Resume Enhancer ${streak} days in a row. Keep the momentum going!</p>
    </div>
`

// updateStreak(userId) sir — call this right after a successful review or chat message.
// swallows its own errors so a streak failure never breaks the real request (same rule as logAi).
const updateStreak = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) return

        const today = new Date()
        const last = user.lastActivityDate

        // already counted today sir — no-op, don't double-increment on a second review same day
        if (last && isSameDay(new Date(last), today)) return

        let nextStreak
        if (last && isYesterday(new Date(last), today)) {
            nextStreak = user.currentStreak + 1
        } else {
            // gap of 2+ days, or first-ever activity sir — streak restarts at 1
            nextStreak = 1
        }

        const longest = Math.max(user.longestStreak, nextStreak)

        await User.findByIdAndUpdate(userId, {
            currentStreak: nextStreak,
            longestStreak: longest,
            lastActivityDate: today,
        })

        // event-driven milestone email sir — fires the moment a threshold is crossed, no cron needed
        if (MILESTONES.includes(nextStreak)) {
            mailSender(user.email, `${nextStreak}-day streak!`, milestoneEmailHtml(user.firstName, nextStreak))
                .catch((err) => console.log('streak milestone email failed:', err.message))
        }
    } catch (err) {
        console.log('streak update failed:', err.message)
    }
}

module.exports = { updateStreak }
