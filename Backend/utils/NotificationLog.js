const Notification = require('../Models/Notification')
const User = require('../Models/User')
const logger = require('./logger')
const { sendPush } = require('./WebPush')

// which User opt-out field gates a PUSH for each in-app notification type sir — same mapping
// a user already controls for the matching EMAIL nudge (see Account.jsx's Email Notifications
// section), per direct request: one flag now gates both channels for a type, no separate push
// toggle. A type with no entry here (interview-scheduled/system/testimonial) has no opt-out at
// all today — same as their in-app/email behavior, always sent.
const PUSH_PREF_FIELD = {
    'streak-break': 'notifyStreak',
    'win-back': 'notifyWinBack',
    'digest': 'notifyDigest',
    'health-check': 'notifyHealthCheck',
    'interview-prep': 'notifyInterviewPrep',
    'new-message': 'notifyNewApplicant',
}

// fire-and-forget sir, same rule as logAi/logAction — a notification failing to save must
// never block the real email send it rides alongside
// notify({ user, type, title, message, link })
const notify = ({ user, type = 'system', title, message, link }) => {
    Notification.create({ user, type, title, message, link })
        .catch((err) => logger.error('notification create failed', { err: err }))

    // real Web Push sir, per direct request — fires for every notify() call, same as the in-app
    // bell entry above, respecting whichever notify* pref this type maps to (if any)
    ;(async () => {
        try {
            const prefField = PUSH_PREF_FIELD[type]
            if (prefField) {
                const u = await User.findById(user).select(prefField)
                if (u && u[prefField] === false) return
            }
            await sendPush(user, { title, body: message || '', url: link || '/Dashboard' })
        } catch (err) {
            logger.error('push notification failed', { err: err, type })
        }
    })()
}

module.exports = { notify }
