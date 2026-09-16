const mongoose = require('mongoose')

// a candidate's saved search sir — "notify me when a matching job gets posted", instead of
// having to keep checking the board manually. Deliberately simple matching criteria (keywords
// against title/description, optional location/employmentType filters) — same "good enough,
// not over-engineered" instinct as the rest of this app's search/matching code (Career.js's
// `match()`), not a full search-index build.
const jobAlertSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // free-text keywords sir, matched case-insensitively against the job's title +
        // description + skills — same shape as a candidate would type into a search box
        keywords: {
            type: String,
            trim: true,
            required: true,
            maxlength: 200,
        },
        location: {
            type: String,
            trim: true,
            maxlength: 150,
        },
        employmentType: {
            type: String,
            trim: true,
        },
        active: {
            type: Boolean,
            default: true,
        },
        // every job this alert has already notified the candidate about sir — prevents the
        // same job re-triggering an email every time the cron runs, without needing a
        // separate join/log table for something this small
        notifiedJobs: [{
            type: mongoose.Schema.ObjectId,
            ref: 'Job',
        }],
        lastCheckedAt: {
            type: Date,
        },
    },
    { timestamps: true }
)

// the cron's own query shape sir — active alerts, newest first for the candidate's own list view
jobAlertSchema.index({ user: 1, active: 1 })

module.exports = mongoose.model('JobAlert', jobAlertSchema)
