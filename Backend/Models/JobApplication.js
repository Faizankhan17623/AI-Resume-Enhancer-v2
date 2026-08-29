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
        // the recruiter from the applicants list, never by the candidate themselves.
        // 'invite_expired' sir — flipped automatically by utils/TestInviteExpiryCron.js once
        // testInviteExpiresAt passes with the candidate never having started an attempt. Without
        // this, an application just sat at 'invited_to_test' forever with no recruiter action
        // available (the Invite-to-test button only ever showed for 'applied'), a dead end the
        // recruiter had no way to recover from. From 'invite_expired' the recruiter can re-invite
        // (see inviteApplicantToTest's eligibility check) same as a fresh 'applied' row.
        status: {
            type: String,
            enum: ['applied', 'invited_to_test', 'completed_test', 'invite_expired', 'rejected', 'hired'],
            default: 'applied',
            index: true,
        },
        // optional links to what was actually sent sir — kept for backward read-compatibility
        // with applications created before the structured form below existed. The new form
        // (resumeUrl below) is what every NEW application actually uses.
        resume: {
            type: mongoose.Schema.ObjectId,
            ref: 'Resume',
        },
        builtResume: {
            type: mongoose.Schema.ObjectId,
            ref: 'BuiltResume',
        },
        // the structured application form sir — every field below is new. resumeUrl/resumePublicId
        // are a real uploaded PDF (Cloudinary, same pattern as Test.js's violation snapshots and
        // BuiltResume.js's exports), <2MB, validated server-side via utils/pdfUpload.js — NOT a
        // ref to a saved Resume/BuiltResume document, since the candidate is asked to attach the
        // actual file at apply time rather than pick from their library for this flow.
        resumeUrl: {
            type: String,
        },
        resumePublicId: {
            type: String,
        },
        experienceLevel: {
            type: String,
            enum: ['fresher', 'experienced'],
        },
        address: {
            line: { type: String, trim: true, maxlength: 200 },
            city: { type: String, trim: true, maxlength: 100 },
            state: { type: String, trim: true, maxlength: 100 },
            pincode: { type: String, trim: true, maxlength: 12 },
        },
        expectedSalary: {
            type: Number,
            min: 0,
        },
        // fresher branch sir — an array so both a bachelor's AND a master's entry can be added,
        // per direct request
        education: [{
            degree: { type: String, enum: ['bachelors', 'masters'] },
            institution: { type: String, trim: true, maxlength: 200 },
            startDate: { type: Date },
            endDate: { type: Date },
            currentlyStudying: { type: Boolean, default: false },
        }],
        // experienced branch sir — an array via the "+ add another employer" control on the form
        currentCtc: {
            type: Number,
            min: 0,
        },
        workHistory: [{
            companyName: { type: String, trim: true, maxlength: 150 },
            startDate: { type: Date },
            endDate: { type: Date },
            currentlyWorking: { type: Boolean, default: false },
        }],
        // set once the candidate actually starts the job's test sir
        testAttempt: {
            type: mongoose.Schema.ObjectId,
            ref: 'TestAttempt',
        },
        // set the moment the recruiter invites this candidate (inviteApplicantToTest /
        // bulkInviteApplicantsToTest, controllers/Job.js) sir — now + 5 hours, per direct
        // request. Distinct from Test.timeLimitMinutes: that's how long an ATTEMPT lasts once
        // started, this is the deadline to START one at all before the invite itself goes stale.
        // startAttempt (controllers/Test.js) checks this and returns a dedicated "expired"
        // response instead of silently letting a week-old invite link still work.
        testInviteExpiresAt: {
            type: Date,
        },
        // AI fit-score sir — computed automatically right after the application is created (see
        // controllers/Job.js's applyToJob + services/fitScoreService.js), best-effort: null means
        // either "not scored yet" or "the recruiter was out of AI-score quota this month", the
        // recruiter's applicant list tells these two apart via fitScoreSkippedReason.
        fitScore: {
            type: Number,
            min: 0,
            max: 100,
        },
        fitTier: {
            type: String,
            enum: ['not_a_fit', 'can_get_it_done', 'hireable', 'best_fit'],
        },
        fitScoreReasoning: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        fitScoreSkippedReason: {
            type: String,
            trim: true,
            maxlength: 300,
        },
    },
    { timestamps: true }
)

// one application per candidate per job sir — re-applying is a no-op, not a duplicate row
jobApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true })
// the candidate's own "my applications" view sir
jobApplicationSchema.index({ candidate: 1, status: 1 })

module.exports = mongoose.model('JobApplication', jobApplicationSchema)
