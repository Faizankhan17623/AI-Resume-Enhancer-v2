const mongoose = require('mongoose')

// a candidate's application to a recruiter-posted Job sir — deliberately a SEPARATE model
// from Application.js, which is a personal, self-service Kanban tracker (free-text company/
// role, no ref to anything). This model is the real thing: it's what actually gates whether a
// candidate is allowed to start the job's proctored Test (see Test.js's startAttempt).
const jobApplicationSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },
        candidate: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // 'invited_to_test' is what unlocks startAttempt for this candidate+job sir — set by
        // the recruiter from the applicants list, never by the candidate themselves
        status: {
            type: String,
            enum: ['applied', 'invited_to_test', 'completed_test', 'rejected', 'hired'],
            default: 'applied',
            index: true,
        },
        // optional links to what was actually sent sir — same optional-link pattern as
        // Application.js, either may be unset
        resume: {
            type: mongoose.Schema.ObjectId,
            ref: 'Resume',
        },
        builtResume: {
            type: mongoose.Schema.ObjectId,
            ref: 'BuiltResume',
        },
        // set once the candidate actually starts the job's test sir
        testAttempt: {
            type: mongoose.Schema.ObjectId,
            ref: 'TestAttempt',
        },
    },
    { timestamps: true }
)

// one application per candidate per job sir — re-applying is a no-op, not a duplicate row
jobApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true })
// the candidate's own "my applications" view sir
jobApplicationSchema.index({ candidate: 1, status: 1 })

module.exports = mongoose.model('JobApplication', jobApplicationSchema)
