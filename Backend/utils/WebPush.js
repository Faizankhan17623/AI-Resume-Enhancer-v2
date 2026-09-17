const webpush = require('web-push')
const PushSubscription = require('../Models/PushSubscription')
const logger = require('./logger')

// VAPID keys identify THIS server to the browser vendors' push services (Google's for Chrome,
// Mozilla's for Firefox, etc.) sir — generated once via `npx web-push generate-vapid-keys` and
// stored in .env as WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY, same as every other secret here.
// Deliberately NOT in utils/checkRequiredEnv.js's REQUIRED_ENV_VARS — push is an enhancement,
// not a boot-blocking dependency, so a server missing these keys still starts up fine and simply
// can't send pushes (sendPush below no-ops with a warning instead of throwing).
const configured = Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY)
if (configured) {
    webpush.setVapidDetails(
        `mailto:${process.env.WEB_PUSH_CONTACT_EMAIL || 'support@resumifyapp.com'}`,
        process.env.WEB_PUSH_PUBLIC_KEY,
        process.env.WEB_PUSH_PRIVATE_KEY
    )
} else {
    logger.warn('WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY not set — push notifications are disabled')
}

// sends one push payload to every subscription this user has sir — fire-and-forget from the
// caller's perspective (notify() below awaits internally so it can clean up dead subscriptions,
// but never throws outward), same "never breaks the real request" rule as mailSender/logAi.
//
// payload: { title, body, url } sir — url is what the service worker's notificationclick opens
const sendPush = async (userId, payload) => {
    if (!configured) return

    const subs = await PushSubscription.find({ user: userId })
    if (subs.length === 0) return

    const body = JSON.stringify(payload)

    await Promise.allSettled(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
                    body
                )
            } catch (err) {
                // 404/410 sir — the push service has permanently discarded this subscription
                // (browser uninstalled, permission revoked, profile deleted, etc.), Web Push's
                // own documented way of saying "stop sending here." Any other status (network
                // blip, 5xx from the push service) is just logged, subscription kept.
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {})
                } else {
                    logger.warn('web push send failed', { err: err.message, statusCode: err.statusCode, userId })
                }
            }
        })
    )
}

module.exports = { sendPush, isPushConfigured: () => configured }
