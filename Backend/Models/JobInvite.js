const mongoose = require('mongoose')

// one invite per (job, email) pair sir — the ONLY way into an invite_only job's application
// form (see Models/Job.js's visibility field). The recruiter sends this, the candidate lands on
// a token-gated page that lets them fill out the same structured application form as a normal
// public apply, then submits it the same way (creates a real JobApplication).
const jobInviteSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },
        recruiter: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ['pending', 'applied', 'expired'],
            default: 'pending',
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        // set once the invited candidate actually applies sir — lets the recruiter's own
        // invite list show which invites converted, without a second query against
        // JobApplication
        application: {
            type: mongoose.Schema.ObjectId,
            ref: 'JobApplication',
        },
    },
    { timestamps: true }
)

// one active invite per (job, email) sir — re-inviting the same email to the same job updates
// the existing row rather than creating a duplicate (see controllers/JobInvite.js's
// sendJobInvite for the upsert)
jobInviteSchema.index({ job: 1, email: 1 }, { unique: true })
// the recruiter's own "invites for this job" list view sir
jobInviteSchema.index({ job: 1, status: 1 })

module.exports = mongoose.model('JobInvite', jobInviteSchema)
