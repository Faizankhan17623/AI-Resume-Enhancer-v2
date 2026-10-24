// Recruiter AI tool schemas sir — controllers/RecruiterAI.js

const { z } = require('zod')
const { objectId, employmentType } = require('./Shared')

const generateJobDescriptionSchema = z.object({
    title: z.string({ error: 'A role title is required' }).trim().min(1, 'A role title is required').max(150),
    employmentType: employmentType.optional(),
    mustHaves: z.string({ error: 'Your must-have requirements are required' }).trim().min(1, 'Your must-have requirements are required').max(2000),
})

const generateInterviewQuestionsSchema = z.object({
    jobId: objectId,
    questionCount: z.coerce.number().int().min(1).max(20).optional(),
})

module.exports = {
    generateJobDescriptionSchema,
    generateInterviewQuestionsSchema,
}
