// Career / application copilot schemas sir — see Models/CareerPlan.js and controllers/Career.js

const { z } = require('zod')
const { objectId, jdText } = require('./Shared')

// application copilot sir — accepts either a published job from the board or pasted job text.
// Keeping this schema here means the controller never has to trust arbitrary ids or unbounded
// pasted descriptions from the browser.
const applicationCopilotSchema = z.object({
    jobId: objectId.optional(),
    resumeId: objectId.optional(),
    jobText: z.string().trim().max(20000, 'Job description is too long').optional(),
}).refine((data) => data.jobId || data.jobText, {
    message: 'A job or job description is required',
    path: ['jobText'],
})

// the rest of Routes/Career.js sir, per 2026-11-14 audit — these five routes did their own
// inline typeof/truthiness checks straight in the controller instead of this file's own
// validate()/zod pattern, with no explicit length cap on free text (relying only on
// express.json's default 100kb body limit, not a deliberate cap like the 20000-char convention
// used everywhere else for JD/pasted-text fields). Same 20000 cap applied here for consistency;
// the controller's own ownership/existence checks (job published, resume belongs to user, etc.)
// are unchanged since zod can't see the database.
const smartMatchSchema = z.object({
    jobId: objectId.optional(),
    resumeId: objectId.optional(),
    jobText: z.string().trim().max(20000, 'Job description is too long').optional(),
})

// jdText sir, per 2026-11-16 audit — this hand-rolled the identical rule Shared.js's jdText()
// already centralizes
const createRoadmapSchema = z.object({
    targetRole: z.string().trim().max(200, 'Target role is too long').optional(),
    jobText: jdText('A target job description'),
    targetJob: objectId.optional(),
})

const createFollowUpSchema = z.object({
    title: z.string().trim().min(1, 'A title is required').max(200, 'Title is too long'),
    dueAt: z.coerce.date({ error: 'A valid due date is required' }),
    kind: z.enum(['follow-up', 'interview', 'deadline', 'custom']).optional(),
    application: objectId.optional(),
})

// required, not optional, sir — per 2026-11-16 audit, an optional field let an empty PATCH body
// pass validation and reach the controller, which then force-wrote completed:false
// unconditionally (!!undefined). The controller now also double-checks 'completed' in req.body
// as defense in depth, but the real fix is requiring it here so a malformed request never
// passes validation in the first place.
const toggleFollowUpSchema = z.object({
    completed: z.boolean({ error: "'completed' is required" }),
})

const interviewFeedbackSchema = z.object({
    question: z.string().trim().min(1, 'A question is required').max(2000, 'Question is too long'),
    answer: z.string().trim().min(1, 'An answer is required').max(20000, 'Answer is too long'),
})

module.exports = {
    applicationCopilotSchema,
    smartMatchSchema,
    createRoadmapSchema,
    createFollowUpSchema,
    toggleFollowUpSchema,
    interviewFeedbackSchema,
}
