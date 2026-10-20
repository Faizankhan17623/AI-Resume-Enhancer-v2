// Shared primitives sir — the single definition of each rule that more than one schema file uses.
//
// Rules that were previously written two or three times (and had drifted) live here once: the
// 10-digit phone number, the password policy, the plan keys, the pagination window. A schema file
// imports what it needs from here instead of restating it, and the frontend gets a consistent
// { field, message } error for every one.

const { z } = require('zod')

const email = z
    .string({ error: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()

// matches Models/User.js's own `match: /^[0-9]{10}$/` sir, and the frontend's check
const phoneNumber = z
    .string({ error: 'Phone number is required' })
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')

// the password POLICY, in one place. Previously only a length check existed, and only in some
// paths — reset had no policy at all, so a reset could set a weaker password than signup allowed.
const password = z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')

const name = (label) => z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(50, `${label} must be at most 50 characters`)

// a Mongo ObjectId sir — a malformed id previously reached Mongoose and threw a CastError,
// which surfaced as a 500 instead of a 400
const objectId = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')

const planKey = z.enum(['Basic', 'Pro', 'ProMax'], { error: 'Please pick a valid plan' })

// shared by createUserSchema (recruiter signup, Auth.js) and recruiterApplicationSchema (the
// post-hoc /For-Recruiters flow, RecruiterApplication.js) sir — one definition, same options either way
const companySize = z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], { error: 'Please select your company size' })

// shared by createJobSchema/updateJobSchema (Job.js) and generateJobDescriptionSchema
// (RecruiterAI.js) sir
const employmentType = z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'], { error: 'Invalid employment type' })

// pagination sir — coerced, bounded, and defaulted in one place instead of a parseInt in each
// controller. The upper bound matters: an unbounded `limit` is an easy way to pull the entire
// collection in one request.
const pagination = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

module.exports = {
    email,
    phoneNumber,
    password,
    name,
    objectId,
    planKey,
    companySize,
    employmentType,
    pagination,
}
