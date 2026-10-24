// Job posting schemas sir — see Models/Job.js and controllers/Job.js.

const { z } = require('zod')
const { objectId, employmentType } = require('./Shared')

// compensation sir — optional at create/update time (a draft can be saved half-filled-in), but
// checked for internal consistency whenever it IS present: 'paid' needs ctcMin<=ctcMax, 'unpaid'
// just needs a duration. Whether compensation is required AT ALL is enforced separately in
// publishJob (Backend/controllers/Job.js), not here — a job can't go live without it, but can
// still exist as an incomplete draft without it.
const compensationFields = {
    compensationType: z.enum(['paid', 'unpaid'], { error: 'Compensation type must be paid or unpaid' }).optional(),
    ctcMin: z.coerce.number().min(0).optional(),
    ctcMax: z.coerce.number().min(0).optional(),
    unpaidDurationMonths: z.coerce.number().min(0).optional(),
    certificateProvided: z.boolean().optional(),
}

const compensationRefinements = (schema) => schema.refine(
    (data) => data.compensationType !== 'paid' || (data.ctcMin !== undefined && data.ctcMax !== undefined),
    { message: 'Enter both a minimum and maximum CTC for a paid role', path: ['ctcMin'] }
).refine(
    (data) => data.compensationType !== 'paid' || data.ctcMin === undefined || data.ctcMax === undefined || data.ctcMax >= data.ctcMin,
    { message: 'Maximum CTC must be greater than or equal to the minimum', path: ['ctcMax'] }
).refine(
    (data) => data.compensationType !== 'unpaid' || data.unpaidDurationMonths !== undefined,
    { message: 'Enter the internship/unpaid duration in months', path: ['unpaidDurationMonths'] }
)

// optional recruiter-set interview-eligibility threshold sir — see Models/Job.js's own comment
// on interviewEligibilityMinScore for why this is a plain percentage, not tied to any one test's
// marks scale
const interviewEligibilityMinScore = z.number().min(0).max(100).optional()

// PATCH /jobs/:jobId/interview-eligibility body sir — see
// controllers/Job.js's updateInterviewEligibilityThreshold for why this is its own tiny schema
// separate from updateJobSchema (that one only ever applies to a draft job)
const updateInterviewEligibilitySchema = z.object({
    interviewEligibilityMinScore: z.number().min(0).max(100).optional(),
})

const createJobSchema = compensationRefinements(z.object({
    companyName: z.string({ error: 'Company name is required' }).trim().min(1, 'Company name is required').max(150),
    title: z.string({ error: 'Title is required' }).trim().min(1, 'Title is required').max(150),
    description: z.string({ error: 'Description is required' }).trim().min(1, 'Description is required').max(5000),
    location: z.string().trim().max(150).optional(),
    employmentType: employmentType.optional(),
    skills: z.array(z.string().trim().max(60)).max(30).optional(),
    interviewEligibilityMinScore,
    ...compensationFields,
}))

const updateJobSchema = compensationRefinements(z.object({
    companyName: z.string().trim().min(1).max(150).optional(),
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    location: z.string().trim().max(150).optional(),
    employmentType: employmentType.optional(),
    skills: z.array(z.string().trim().max(60)).max(30).optional(),
    interviewEligibilityMinScore,
    // only meaningful while still a draft sir — same reason this whole schema only applies to a
    // draft job (see controllers/Job.js's updateJob): visibility must be locked in before publish
    visibility: z.enum(['public', 'invite_only']).optional(),
    ...compensationFields,
}))

const jobIdParamSchema = z.object({ jobId: objectId })

module.exports = {
    createJobSchema,
    updateJobSchema,
    updateInterviewEligibilitySchema,
    jobIdParamSchema,
}
