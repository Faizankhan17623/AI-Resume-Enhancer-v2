const mongoose = require('mongoose')

// a recruiter-posted job listing sir — public once published. companyName is a plain string
// rather than a ref to a separate Company entity: a Recruiter account already represents one
// company (see User.recruiterApplication), and this app has no multi-recruiter-per-company
// concept to justify a whole extra collection for it.
const jobSchema = new mongoose.Schema(
    {
        recruiter: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        companyName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
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
            maxlength: 5000,
        },
        location: {
            type: String,
            trim: true,
            maxlength: 150,
        },
        employmentType: {
            type: String,
            enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
        },
        // simple tag list sir — public search/filter matches against these, not a full-text index
        skills: [{ type: String, trim: true, maxlength: 60 }],
        // compensation sir — required once published (checked in the controller, same as the
        // test-attachment rule used to be), optional while still a draft so a recruiter can save
        // partial progress. paid jobs give a CTC RANGE (min/max), not one number, since real
        // compensation bands are rarely a single figure; unpaid jobs (internships, mostly) get a
        // duration + whether a completion certificate is issued instead.
        compensationType: {
            type: String,
            enum: ['paid', 'unpaid'],
        },
        ctcMin: {
            type: Number,
            min: 0,
        },
        ctcMax: {
            type: Number,
            min: 0,
        },
        unpaidDurationMonths: {
            type: Number,
            min: 0,
        },
        certificateProvided: {
            type: Boolean,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'closed'],
            default: 'draft',
            index: true,
        },
        // set once the recruiter attaches a proctored test to this job sir — optional until then,
        // a job can exist and accept applications before a test is built for it
        test: {
            type: mongoose.Schema.ObjectId,
            ref: 'Test',
        },
        // incremented on every getPublicJob fetch sir — a simple hit counter, not a unique-visitor
        // count (no session/cookie dedup), same "good enough for a funnel, not analytics-grade"
        // tradeoff as VisitorLog.js makes elsewhere for site-wide traffic
        views: {
            type: Number,
            default: 0,
        },
        // set to now+30 days the moment the job is PUBLISHED (publishJob sets this, not
        // createJob — a draft never expires) sir. A scheduled job (utils/JobExpiryCron.js, run
        // from the worker process same as every other scheduled state transition in this app)
        // flips any published job past this date to 'closed' automatically.
        expiresAt: {
            type: Date,
        },
    },
    { timestamps: true }
)

// the public board's own query shape sir — published jobs, newest first
jobSchema.index({ status: 1, createdAt: -1 })
// the expiry cron's own query shape sir — published jobs whose expiresAt has passed
jobSchema.index({ status: 1, expiresAt: 1 })

module.exports = mongoose.model('Job', jobSchema)
