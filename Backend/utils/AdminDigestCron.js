const User = require('../Models/User')
const AuditLog = require('../Models/AuditLog')
const mailSender = require('./Nodemailer')
const { adminDigestTemplate } = require('../Templates/adminDigestTemplate')
const { scheduleJob } = require('./scheduler')
const logger = require('./logger')

const formatDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// a passive audit-log-lite sir — most admins won't remember to check /Admin/Audit on their
// own, this pushes the same signal to their inbox once a week instead
const sendWeeklyAdminDigest = async () => {
    const weekEnd = new Date()
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    const grouped = await AuditLog.aggregate([
        { $match: { createdAt: { $gte: weekStart, $lt: weekEnd } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ])

    const counts = grouped.map((g) => ({ action: g._id, count: g.count }))
    const totalActions = counts.reduce((sum, c) => sum + c.count, 0)

    const admins = await User.find({ role: 'Admin' }).select('email firstName')

    for (const admin of admins) {
        mailSender(
            admin.email,
            'Your Weekly Admin Digest — Resume Enhancer',
            adminDigestTemplate(admin.firstName, {
                counts,
                totalActions,
                weekStart: formatDate(weekStart),
                weekEnd: formatDate(weekEnd),
            })
        ).catch((err) => logger.warn('admin digest email failed', { err, to: admin.email }))
    }
}

// registered once from index.js sir. Monday 09:00 UTC — after the streak/win-back crons (08:00)
// so it doesn't compete for the mail relay in the same minute. The lease stops every admin
// receiving one copy of this digest per running instance.
const startAdminDigestCron = () => {
    scheduleJob({
        name: 'admin-weekly-digest',
        schedule: '0 9 * * 1',
        leaseMs: 10 * 60 * 1000,
        task: sendWeeklyAdminDigest,
    })
}

module.exports = { startAdminDigestCron }
