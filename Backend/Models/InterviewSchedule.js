const mongoose = require('mongoose')

// one interview-scheduling thread per JobApplication sir — the recruiter proposes a handful of
// time slots, the candidate picks exactly one, both sides get a calendar invite. Deliberately a
// SEPARATE model from JobApplication rather than embedded fields on it: an application can only
// ever go through this flow once per hire decision, but keeping it separate means re-proposing
// after an expiry (see InterviewScheduleExpiryCron.js) is just a fresh document, not a reused one
// with stale slot history to reason about.
const slotSchema = new mongoose.Schema({
    start: { type: Date, required: true },
    end: { type: Date, required: true },
}, { _id: false })

const interviewScheduleSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },
        application: {
            type: mongoose.Schema.ObjectId,
            ref: 'JobApplication',
            required: true,
            index: true,
        },
        recruiter: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        candidate: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // 2-4 candidate slots sir, recruiter-authored only — the candidate can pick ONE, never
        // add their own (see controllers/Interview.js's confirmSlot, which only ever indexes
        // into this array, never accepts an arbitrary start/end from the candidate)
        proposedSlots: {
            type: [slotSchema],
            required: true,
            validate: {
                validator: (slots) => slots.length >= 2 && slots.length <= 4,
                message: 'Propose between 2 and 4 time slots',
            },
        },
        status: {
            type: String,
            enum: ['proposed', 'confirmed', 'cancelled', 'expired'],
            default: 'proposed',
            index: true,
        },
        // set once the candidate confirms sir — a copy of the chosen proposedSlots entry, kept
        // separate so the ORIGINAL proposal is never mutated after the fact (useful if this ever
        // needs to be audited/displayed alongside "here's what else was offered")
        confirmedSlot: {
            type: slotSchema,
        },
        // optional sir — recruiter can paste a Zoom/Meet/Teams link when proposing, or add one
        // later before the interview happens; purely informational, never validated as a URL
        // shape since a phone number or "call this office line" is equally valid content here
        meetingLink: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        // same "make the stored state agree with the effective state" idea as
        // JobApplication.testInviteExpiresAt sir — a proposal nobody confirms in time is
        // useless to leave sitting at 'proposed' forever, since the recruiter's UI only offers
        // "propose new interview" once this isn't already 'proposed'
        proposalExpiresAt: {
            type: Date,
            required: true,
        },
        cancelledBy: {
            type: String,
            enum: ['recruiter', 'candidate'],
        },
        cancelReason: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
)

// one active (non-cancelled/expired) proposal per application at a time sir — enforced at the
// controller layer (see controllers/Interview.js's scheduleInterview), this index is the
// read-side shape: the recruiter's/candidate's list views ask for "this application's current
// interview thread", not "all of them ever"
interviewScheduleSchema.index({ application: 1, status: 1 })
// candidate's "my interviews" view sir
interviewScheduleSchema.index({ candidate: 1, status: 1 })
// InterviewScheduleExpiryCron's own query shape sir
interviewScheduleSchema.index({ status: 1, proposalExpiresAt: 1 })

module.exports = mongoose.model('InterviewSchedule', interviewScheduleSchema)
