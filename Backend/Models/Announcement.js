const mongoose = require('mongoose')

// broadcast banners sir — admin writes one, every user's frontend shows the active one
const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        // flip this off to pull a banner down without deleting it sir
        active: {
            type: Boolean,
            default: true,
        },
        // optional auto-expiry sir — past this date the public endpoint stops serving it
        expiresAt: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Announcement', announcementSchema)
