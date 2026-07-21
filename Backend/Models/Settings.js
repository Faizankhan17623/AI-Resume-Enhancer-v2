const mongoose = require('mongoose')

// one row per toggle sir — e.g. key 'feature.coverLetter', 'feature.review', 'feature.jobSearch'
// read/written through utils/FeatureFlags.js, never queried directly by controllers
const settingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        // admin-facing reason sir, shown in the Settings tab ("disabled for cost spike investigation" etc)
        note: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Settings', settingsSchema)
