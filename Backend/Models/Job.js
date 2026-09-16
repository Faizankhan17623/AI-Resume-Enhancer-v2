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
        // 'invite_only' jobs sir, per direct request — never appear on the public /Jobs board
        // (excluded in listPublicJobs's query) and have no public apply flow at all. The
        // recruiter instead sends a direct invite (Models/JobInvite.js) to a specific email;
        // only that invited person can reach the application form, via a token-gated link, not
        // by browsing the board. A 'public' job works exactly as before this field existed.
        visibility: {
            type: String,
            enum: ['public', 'invite_only'],
            default: 'public',
        },
        // set once the recruiter attaches a proctored test to this job sir — optional until then,
        // a job can exist and accept applications before a test is built for it
        test: {
            type: mongoose.Schema.ObjectId,
            ref: 'Test',
        },
        // optional recruiter-set percentage threshold sir (against TestAttempt.score /
        // Test.totalMarks * 100, computed at gate-check time — TestAttempt stores raw marks,
        // never a percentage, so there is nothing to store or drift out of sync here). Gates
        // whether "Schedule interview" appears on a completed_test applicant in
        // controllers/Interview.js's scheduleInterview. Left unset (null) means no auto-gate —
        // any completed_test applicant is eligible, same as before this feature existed.
        interviewEligibilityMinScore: {
            type: Number,
            min: 0,
            max: 100,
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
