// Web Push subscription schemas sir — see Models/PushSubscription.js and
// controllers/Notification.js

const { z } = require('zod')

const subscribeToPushSchema = z.object({
    endpoint: z.string({ error: 'Invalid push subscription' }).trim().min(1, 'Invalid push subscription').max(2000),
    keys: z.object({
        p256dh: z.string({ error: 'Invalid push subscription' }).trim().min(1, 'Invalid push subscription').max(500),
        auth: z.string({ error: 'Invalid push subscription' }).trim().min(1, 'Invalid push subscription').max(500),
    }, { error: 'Invalid push subscription' }),
    // maxlength 300 sir, same bound as Models/PushSubscription.js's own userAgent field
    userAgent: z.string().trim().max(300).optional(),
})

const unsubscribeFromPushSchema = z.object({
    endpoint: z.string({ error: 'endpoint is required' }).trim().min(1, 'endpoint is required').max(2000),
})

module.exports = {
    subscribeToPushSchema,
    unsubscribeFromPushSchema,
}
