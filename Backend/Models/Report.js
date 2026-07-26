const mongoose = require('mongoose')

// user-submitted bug reports + feature suggestions sir — same shape for both, just a
// type flag, so one collection/moderation queue covers both instead of duplicating everything
const reportSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['bug', 'feature'],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        // open -> in_progress/planned -> resolved/declined sir
        status: {
            type: String,
            enum: ['open', 'in_progress', 'planned', 'resolved', 'declined'],
            default: 'open',
            index: true,
        },
        adminNote: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        reviewedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

reportSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Report', reportSchema)
