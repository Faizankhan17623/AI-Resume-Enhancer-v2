const mongoose = require('mongoose')

// one row per (user, device) pair sir — powers the new-device login alert. A "device" here is a
// hash of browser + OS + IP prefix, NOT the raw IP alone: IPs rotate constantly on mobile data
// and behind NAT/CGNAT, so keying on IP alone would fire a false "new device" alert on nearly
// every mobile login. Keyed on the browser+OS pair instead, which is what actually stays stable
// across a real person's normal day of using the same phone/laptop from different networks.
const knownDeviceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // sha256 of userId + normalized browser + normalized OS sir — see
        // utils/deviceFingerprint.js for exactly what goes into it
        deviceHash: {
            type: String,
            required: true,
        },
        browserLabel: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        osLabel: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        // last IP seen from this device sir — informational only (shown in the alert email),
        // never part of the hash itself
        lastIp: {
            type: String,
            trim: true,
            maxlength: 64,
        },
        firstSeenAt: {
            type: Date,
            default: Date.now,
        },
        lastSeenAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
)

// one row per device per user sir — a re-seen device updates in place rather than growing
// unbounded rows for the same laptop logging in every day
knownDeviceSchema.index({ user: 1, deviceHash: 1 }, { unique: true })

module.exports = mongoose.model('KnownDevice', knownDeviceSchema)
