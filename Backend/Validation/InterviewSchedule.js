// Interview scheduling schemas sir — see Models/InterviewSchedule.js, controllers/Interview.js

const { z } = require('zod')

const interviewSlotSchema = z.object({
    start: z.coerce.date({ error: 'A valid start time is required' }),
    end: z.coerce.date({ error: 'A valid end time is required' }),
}).refine((slot) => slot.end > slot.start, {
    message: 'A slot\'s end time must be after its start time',
    path: ['end'],
})

// recruiter-authored only sir — the candidate's confirm-slot request never carries a slot body,
// only an index into what the recruiter already proposed (see confirmSlotSchema below)
const scheduleInterviewSchema = z.object({
    slots: z.array(interviewSlotSchema).min(2, 'Propose at least 2 time slots').max(4, 'Propose at most 4 time slots'),
    // http(s)-only sir, per 2026-11-16 audit — this used to accept any string including a
    // javascript: URI, which escapeHtml() alone can't neutralize since it's a legitimate-looking
    // href value, not markup. A malicious/compromised recruiter could set this to a javascript:
    // or data: URI and it would render as a clickable link in the real confirmation email sent
    // to both the candidate and the recruiter's own copy (Templates/InterviewConfirmed.js).
    meetingLink: z.string().trim().max(500).url('Please enter a valid meeting link').regex(/^https?:\/\//i, 'Meeting link must start with http:// or https://').optional(),
    notes: z.string().trim().max(1000).optional(),
}).refine(
    (data) => data.slots.every((slot) => slot.start.getTime() > Date.now()),
    { message: 'Every proposed slot must be in the future', path: ['slots'] }
)

const confirmSlotSchema = z.object({
    slotIndex: z.number({ error: 'A slot must be selected' }).int().min(0).max(3),
})

const cancelInterviewSchema = z.object({
    reason: z.string().trim().max(500).optional(),
})

// recommendation is required sir — strengths/concerns are free text, optional like every other
// "notes" field in this codebase (recruiterNotes, cancelReason, etc.)
const submitInterviewFeedbackSchema = z.object({
    recommendation: z.enum(['strong_yes', 'yes', 'no', 'strong_no'], { error: 'A recommendation is required' }),
    rating: z.number({ error: 'A rating is required' }).int().min(1).max(5),
    strengths: z.string().trim().max(1000).optional(),
    concerns: z.string().trim().max(1000).optional(),
})

module.exports = {
    scheduleInterviewSchema,
    confirmSlotSchema,
    cancelInterviewSchema,
    submitInterviewFeedbackSchema,
}
