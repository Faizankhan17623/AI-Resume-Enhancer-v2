// Career / application copilot schemas sir — see Models/CareerPlan.js and controllers/Career.js

const { z } = require('zod')
const { objectId } = require('./Shared')

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

module.exports = {
    applicationCopilotSchema,
}
