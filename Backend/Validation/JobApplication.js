// Job application schemas sir — the candidate's apply form plus the recruiter's per-applicant
// actions. See Models/JobApplication.js and controllers/Job.js.

const { z } = require('zod')
const { objectId } = require('./Shared')

// an OPTIONAL date field sir — e.g. an "end date" input left blank when a form's "currently
// studying/working" checkbox is checked. A plain HTML date input, once disabled rather than
// unmounted, still submits its value as an empty string '' (never undefined), and
// z.coerce.date() turns '' into `new Date('')` — an Invalid Date object, which Zod then rejects
// with the confusing message "expected date, received Date" (found live: this broke every
// fresher/experienced application on the new structured apply form). Stripping '' to undefined
// BEFORE the date coercion runs is what actually makes "optional" mean optional here.
const optionalDate = z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.date().optional()
)

// the structured application form sir — sent as multipart/form-data (the resume PDF rides
// alongside it as req.files.resume, checked separately via utils/pdfUpload.js since Zod doesn't
// see file uploads). The controller JSON.parses the form's single 'data' field into this shape
// before calling .parse() here — see controllers/Job.js's applyToJob.
const addressSchema = z.object({
    line: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(12).optional(),
})

const educationEntrySchema = z.object({
    degree: z.enum(['bachelors', 'masters'], { error: 'Degree must be bachelors or masters' }),
    institution: z.string().trim().min(1, 'Institution is required').max(200),
    startDate: z.coerce.date({ error: 'A valid start date is required' }),
    endDate: optionalDate,
    currentlyStudying: z.boolean().default(false),
}).refine(
    (data) => data.currentlyStudying || data.endDate !== undefined,
    { message: 'Enter an end date, or mark this as currently studying', path: ['endDate'] }
)

const workHistoryEntrySchema = z.object({
    companyName: z.string().trim().min(1, 'Company name is required').max(150),
    startDate: z.coerce.date({ error: 'A valid start date is required' }),
    endDate: optionalDate,
    currentlyWorking: z.boolean().default(false),
}).refine(
    (data) => data.currentlyWorking || data.endDate !== undefined,
    { message: 'Enter an end date, or mark this as your current employer', path: ['endDate'] }
)

const applyToJobSchema = z.object({
    experienceLevel: z.enum(['fresher', 'experienced'], { error: 'Please select fresher or experienced' }),
    address: addressSchema,
    expectedSalary: z.coerce.number().min(0, 'Expected salary must be a positive number'),
    // fresher branch sir
    education: z.array(educationEntrySchema).max(10).optional(),
    // experienced branch sir
    currentCtc: z.coerce.number().min(0).optional(),
    workHistory: z.array(workHistoryEntrySchema).max(20).optional(),
}).refine(
    (data) => data.experienceLevel !== 'fresher' || (data.education && data.education.length > 0),
    { message: 'Add at least one education entry', path: ['education'] }
).refine(
    (data) => data.experienceLevel !== 'experienced' || data.currentCtc !== undefined,
    { message: 'Enter your current CTC', path: ['currentCtc'] }
).refine(
    (data) => data.experienceLevel !== 'experienced' || (data.workHistory && data.workHistory.length > 0),
    { message: 'Add at least one previous/current employer', path: ['workHistory'] }
)

const setApplicationOutcomeSchema = z.object({
    status: z.enum(['hired', 'rejected'], { error: 'Status must be hired or rejected' }),
})

// recruiter's PRIVATE notes on one applicant sir — see Models/JobApplication.js's own comment
const updateApplicantNotesSchema = z.object({
    notes: z.string().trim().max(2000).optional(),
})

const bulkInviteApplicantsSchema = z.object({
    applicationIds: z.array(objectId, { error: 'applicationIds must be a non-empty array' })
        .min(1, 'applicationIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 applicants at once'),
})

const bulkApplicationOutcomeSchema = z.object({
    applicationIds: z.array(objectId, { error: 'applicationIds must be a non-empty array' })
        .min(1, 'applicationIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 applicants at once'),
    status: z.enum(['hired', 'rejected'], { error: 'Status must be hired or rejected' }),
})

module.exports = {
    applyToJobSchema,
    setApplicationOutcomeSchema,
    updateApplicantNotesSchema,
    bulkInviteApplicantsSchema,
    bulkApplicationOutcomeSchema,
}
