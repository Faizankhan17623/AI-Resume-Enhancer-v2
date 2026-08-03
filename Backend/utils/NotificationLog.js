const Notification = require('../Models/Notification')
const logger = require('./logger')

// fire-and-forget sir, same rule as logAi/logAction — a notification failing to save must
// never block the real email send it rides alongside
// notify({ user, type, title, message, link })
const notify = ({ user, type = 'system', title, message, link }) => {
    Notification.create({ user, type, title, message, link })
        .catch((err) => logger.error('notification create failed', { err: err }))
}

module.exports = { notify }
