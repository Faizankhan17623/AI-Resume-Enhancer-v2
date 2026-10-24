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
    meetingLink: z.string().trim().max(500).optional(),
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

module.exports = {
    scheduleInterviewSchema,
    confirmSlotSchema,
    cancelInterviewSchema,
}
