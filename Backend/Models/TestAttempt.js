const mongoose = require('mongoose')

// one candidate's attempt at a recruiter's Test sir — violations are an embedded,
// append-only event log (same shape as AuditLog.js) scoped to THIS attempt only.
//
// NOTE sir: violations are deliberately never written onto the User document itself.
// A look-away flag can be a false positive (lighting, glasses, a glance at notes) and is only
// meaningful in the context of one recruiter's one test — writing it onto the account would make
// it follow the candidate into every future test with every other recruiter. The recruiter who
// owns this test sees the full violation log (with snapshots) right here on the attempt.
const testAttemptSchema = new mongoose.Schema(
    {
        test: {
            type: mongoose.Schema.ObjectId,
            ref: 'Test',
            required: true,
            index: true,
        },
        candidate: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        answers: [
            {
                questionId: { type: mongoose.Schema.ObjectId, required: true },
                answer: { type: String, trim: true, maxlength: 5000 },
            },
        ],
        status: {
            type: String,
            enum: ['in-progress', 'completed', 'terminated_violations', 'terminated_timeout'],
            default: 'in-progress',
            index: true,
        },
        violations: [
            {
                type: { type: String, enum: ['look-away'], default: 'look-away' },
                snapshotUrl: { type: String },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        // denormalized copy of violations.length sir — lets gating/list views read a single
        // int instead of counting the array on every check
        violationCount: {
            type: Number,
            default: 0,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        // startedAt + test.timeLimitMinutes, computed once at creation sir — the server-side
        // source of truth for the countdown, so a page refresh or a tampered client clock can't
        // extend a candidate's time
        endsAt: {
            type: Date,
            required: true,
        },
        submittedAt: {
            type: Date,
        },
        // sum of marks earned on auto-gradable (mcq) questions sir, out of the test's
        // totalMarks — null until submitted. Not a percentage: matches the recruiter's own
        // marks scale (e.g. 68 out of a 100-mark test), same "text questions aren't
        // auto-graded" limitation as before, see scoreAnswers in controllers/Test.js
        score: {
            type: Number,
        },
    },
    { timestamps: true }
)

// unique sir — a candidate gets exactly ONE attempt document per test, ever (an in-progress one
// is resumed, never re-created; a completed one blocks any new create() at the controller layer
// — see Test.js's startAttempt). This index makes that a hard DB guarantee instead of relying
// solely on the two sequential findOne checks startAttempt already does, closing the narrow race
// between those checks and the create() call that follows them.
testAttemptSchema.index({ test: 1, candidate: 1 }, { unique: true })

module.exports = mongoose.model('TestAttempt', testAttemptSchema)
