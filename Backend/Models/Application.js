const mongoose = require('mongoose')

// one job application a user is tracking sir — a simple Kanban card, status is the column
const applicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        company: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        role: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        // the Kanban column sir — drag-and-drop on the frontend just PATCHes this
        status: {
            type: String,
            enum: ['Applied', 'Interview', 'Offer', 'Rejected'],
            default: 'Applied',
        },
        location: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        jobUrl: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        appliedDate: {
            type: Date,
            default: Date.now,
        },
        // optional links to what was actually sent sir — either or both may be unset,
        // and either may point at a document since deleted (not populated, just an id)
        resume: {
            type: mongoose.Schema.ObjectId,
            ref: 'Resume',
        },
        builtResume: {
            type: mongoose.Schema.ObjectId,
            ref: 'BuiltResume',
        },
    }, { timestamps: true }
)

applicationSchema.index({ user: 1, status: 1 })

module.exports = mongoose.model('Application', applicationSchema)
