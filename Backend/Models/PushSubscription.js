const mongoose = require('mongoose')

// one Web Push subscription per browser/device sir — a user can have several (phone, laptop,
// two different browsers), so this is a separate collection, not a single field on User. Created
// when the frontend calls PushManager.subscribe() and hands the resulting subscription object to
// POST /notifications/push/subscribe; deleted on explicit unsubscribe OR automatically the first
// time a push to it comes back 404/410 (utils/WebPush.js's sendPush), since that status means the
// browser vendor's push service has permanently discarded it (uninstall, permission revoked, etc.)
const pushSubscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // the whole PushSubscription.toJSON() object from the browser sir — endpoint + keys.p256dh
        // + keys.auth, exactly the shape the web-push npm package's sendNotification expects as
        // its second argument, so this is stored as-is rather than picked apart into columns
        endpoint: {
            type: String,
            required: true,
            unique: true,
        },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
        },
        // which browser/OS this was sir, purely informational (shown on the account page so a
        // user can tell which of their devices a subscription belongs to before removing it) —
        // never parsed/relied on for any real logic
        userAgent: {
            type: String,
            trim: true,
            maxlength: 300,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema)
