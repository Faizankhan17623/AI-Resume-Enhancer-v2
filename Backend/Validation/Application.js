// Job application tracker schemas sir — see Models/Application.js and
// controllers/Application.js. resume/builtResume/review are only format-checked here (the
// ownership check — does this id actually belong to the caller — still happens in the
// controller, since that needs an async DB lookup Zod can't do).

const { z } = require('zod')
const { objectId } = require('./Shared')

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected']

const createApplicationSchema = z.object({
    company: z.string({ error: 'Company and role are required' }).trim().min(1, 'Company and role are required').max(120),
    role: z.string({ error: 'Company and role are required' }).trim().min(1, 'Company and role are required').max(120),
    status: z.enum(STATUSES, { error: 'Invalid status' }).optional(),
    location: z.string().trim().max(120).optional(),
    jobUrl: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(2000).optional(),
    appliedDate: z.coerce.date().optional(),
    resume: objectId.optional(),
    builtResume: objectId.optional(),
    review: objectId.optional(),
})

// same fields as create, but every one is optional sir — a PATCH can touch just one field.
// resume/builtResume/review also accept '' or null (the controller's own "unset this link"
// signal, application.js:150-185) sir — a format-valid id, or falsy, nothing else
const unsettableObjectId = z.union([objectId, z.literal(''), z.null()]).optional()
const updateApplicationSchema = z.object({
    company: z.string().trim().max(120).optional(),
    role: z.string().trim().max(120).optional(),
    status: z.enum(STATUSES, { error: 'Invalid status' }).optional(),
    location: z.string().trim().max(120).optional(),
    jobUrl: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(2000).optional(),
    appliedDate: z.coerce.date().optional(),
    resume: unsettableObjectId,
    builtResume: unsettableObjectId,
    review: unsettableObjectId,
})

module.exports = {
    createApplicationSchema,
    updateApplicationSchema,
}
