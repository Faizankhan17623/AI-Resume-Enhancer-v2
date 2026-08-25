// The request schemas sir — one definition per rule, reused everywhere that rule applies.
//
// Rules that were previously written two or three times (and had drifted) now live here once:
// the 10-digit phone number, the password policy, the plan keys, the pagination window. A
// controller no longer restates them, and the frontend gets a consistent { field, message } error
// for every one.
//
// Deliberately NOT exhaustive: this covers the auth and account surface, which is where the
// hand-written checks were densest and where a mistake is most costly. The `validate` middleware
// is the extension point for the rest, added route by route.

const { z } = require('zod')

// ---------------------------------------------------------------------------
// shared primitives sir — the single definition of each rule
// ---------------------------------------------------------------------------

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

const otp = z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => /^[0-9]{4,8}$/.test(v), 'Please enter a valid OTP')

const planKey = z.enum(['Basic', 'Pro', 'ProMax'], { error: 'Please pick a valid plan' })

// shared by createUserSchema (recruiter signup) and recruiterApplicationSchema (the post-hoc
// /For-Recruiters flow) sir — one definition, same options either way
const companySize = z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], { error: 'Please select your company size' })

// pagination sir — coerced, bounded, and defaulted in one place instead of a parseInt in each
// controller. The upper bound matters: an unbounded `limit` is an easy way to pull the entire
// collection in one request.
const pagination = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

// a confirm-password pair sir — the check that used to justify STORING a second bcrypt hash on
// the user document. It belongs here: it's a property of the submission, not of the user.
const withPasswordConfirmation = (schema, passwordField, confirmField) =>
    schema.refine((data) => data[passwordField] === data[confirmField], {
        message: 'Password and confirm password do not match',
        path: [confirmField],
    })

// ---------------------------------------------------------------------------
// auth sir
// ---------------------------------------------------------------------------

// accountType picks the signup path sir — 'User' is the default/normal path, 'Recruiter'
// additionally requires the same five company fields recruiterApplicationSchema asks for
// later in the post-hoc /For-Recruiters flow. Choosing Recruiter here sets role: 'Recruiter'
// immediately (see controllers/user.js's createUser) but the account stays LOCKED — every
// recruiter write action is blocked until an Admin approves (see isApprovedRecruiter in
// Middlewares/Auth.js) — so this is a fast-track signup, not a trust shortcut.
const createUserSchema = z.object({
    firstName: name('First name'),
    lastName: name('Last name'),
    email,
    password,
    number: phoneNumber,
    Code: z.string({ error: 'Country code is required' }).trim().min(1, 'Country code is required'),
    otp,
    accountType: z.enum(['User', 'Recruiter']).default('User'),
    companyName: z.string().trim().max(150).optional(),
    companyWebsite: z.string().trim().max(300).optional(),
    companySize: companySize.optional(),
    location: z.string().trim().max(150).optional(),
    hiringNeeds: z.string().trim().max(2000).optional(),
    // whoever's referral link brought this signup here sir — optional, purely additive, never
    // required. Validated as a plausible code shape only; whether it actually matches an existing
    // user is checked in the controller (a bad/unknown code is just silently ignored there, not
    // a signup-blocking error, so a stale or mistyped link never breaks someone's signup).
    referralCode: z.string().trim().max(20).optional(),
}).refine(
    (data) => data.accountType !== 'Recruiter' || !!data.companyName?.trim(),
    { message: 'Company name is required', path: ['companyName'] }
).refine(
    (data) => data.accountType !== 'Recruiter' || (!!data.companyWebsite?.trim() && /^https?:\/\/.+\..+/i.test(data.companyWebsite.trim())),
    { message: 'Please enter a valid company website (e.g. https://example.com)', path: ['companyWebsite'] }
).refine(
    (data) => data.accountType !== 'Recruiter' || !!data.companySize,
    { message: 'Please select your company size', path: ['companySize'] }
).refine(
    (data) => data.accountType !== 'Recruiter' || !!data.location?.trim(),
    { message: 'Location is required', path: ['location'] }
).refine(
    (data) => data.accountType !== 'Recruiter' || !!data.hiringNeeds?.trim(),
    { message: 'Please tell us your hiring needs', path: ['hiringNeeds'] }
)

const loginSchema = z.object({
    email,
    // NOT the full policy sir — an existing account may predate it, and a policy-shaped error on
    // login would tell an attacker their guess was the wrong SHAPE rather than simply wrong
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
})

const sendOtpSchema = z.object({ email })

const forgotPasswordSchema = z.object({ email })

const resetPasswordSchema = withPasswordConfirmation(
    z.object({
        token: z.string({ error: 'Reset token is required' }).min(1, 'Reset token is required'),
        newPassword: password,
        confirmNewPassword: z.string({ error: 'Please confirm your new password' }),
    }),
    'newPassword',
    'confirmNewPassword'
)

const changePasswordSchema = withPasswordConfirmation(
    z.object({
        oldPassword: z.string({ error: 'Current password is required' }).min(1, 'Current password is required'),
        newPassword: password,
        confirmNewPassword: z.string({ error: 'Please confirm your new password' }),
    }),
    'newPassword',
    'confirmNewPassword'
)

// ---------------------------------------------------------------------------
// account sir
// ---------------------------------------------------------------------------

const updateFirstNameSchema = z.object({ firstName: name('First name') })
const updateLastNameSchema = z.object({ lastName: name('Last name') })
// no OTP on this one sir — changing the account email is gated by the existing session
// (Auth middleware), matching what controllers/user.js#updateEmail actually enforces.
// Adding an OTP requirement here would have been a silent breaking API change.
const updateEmailSchema = z.object({ email })
const updateNumberSchema = z.object({ number: phoneNumber, CountryCode: z.string().trim().min(1).optional() })

const notificationPrefsSchema = z.object({
    notifyStreak: z.boolean().optional(),
    notifyWinBack: z.boolean().optional(),
    notifyDigest: z.boolean().optional(),
    notifyHealthCheck: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// payment sir — the amount is NEVER taken from the client, only the plan key
// ---------------------------------------------------------------------------

const createOrderSchema = z.object({ plan: planKey })

const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string().min(1, 'Order id is required'),
    razorpay_payment_id: z.string().min(1, 'Payment id is required'),
    razorpay_signature: z.string().min(1, 'Signature is required'),
})

// ---------------------------------------------------------------------------
// admin sir — these endpoints change roles and money, so their inputs are the
// ones most worth constraining
// ---------------------------------------------------------------------------

const roleSchema = z.enum(['User', 'Support', 'Admin', 'Recruiter'], { error: 'Invalid role' })

const updateUserRoleSchema = z.object({ role: roleSchema })

const bulkUpdateRoleSchema = z.object({
    userIds: z.array(objectId, { error: 'userIds must be a non-empty array' })
        .min(1, 'userIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 users at once'),
    role: roleSchema,
})

// field names mirror controllers/Admin.js exactly sir — `banned`, not `isBanned` (that's the
// MODEL's field). Getting this wrong would reject every legitimate request from the existing
// admin UI, so it's taken from the controller's own destructuring rather than from the schema.
const banUserSchema = z.object({
    banned: z.boolean({ error: "'banned' must be true or false" }),
    reason: z.string().trim().max(500).optional(),
})

const bulkBanSchema = z.object({
    userIds: z.array(objectId, { error: 'userIds must be a non-empty array' })
        .min(1, 'userIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 users at once'),
    banned: z.boolean({ error: "'banned' must be true or false" }),
    reason: z.string().trim().max(500).optional(),
})

// `delta` sir, a non-zero signed adjustment (negative refunds credits), matching the controller.
// Bounded on both sides: an unbounded delta here is effectively a free-credits endpoint.
const adjustCreditsSchema = z.object({
    delta: z.coerce
        .number()
        .int("'delta' must be a non-zero integer (negative refunds credits)")
        .refine((n) => n !== 0, "'delta' must be a non-zero integer (negative refunds credits)")
        .refine((n) => Math.abs(n) <= 100000, 'That adjustment is too large'),
    reason: z.string().trim().max(300).optional(),
})

// broadcast bonus sir — POSITIVE only (a broadcast is always a gift, never a mass charge), same
// upper bound reasoning as adjustCreditsSchema
const grantCreditsToAllSchema = z.object({
    credits: z.coerce
        .number()
        .int("'credits' must be a positive integer")
        .positive("'credits' must be a positive integer")
        .max(100000, 'That amount is too large'),
    reason: z.string().trim().max(300).optional(),
})

const updateUserPlanSchema = z.object({
    plan: planKey,
})

const userIdParamSchema = z.object({ userId: objectId })

// ---------------------------------------------------------------------------
// recruiter proctored tests sir
// ---------------------------------------------------------------------------

const testQuestionSchema = z.object({
    prompt: z.string({ error: 'Question prompt is required' }).trim().min(1, 'Question prompt is required').max(2000),
    type: z.enum(['mcq', 'text'], { error: 'Question type must be mcq or text' }),
    options: z.array(z.string().trim().max(300)).max(10).optional(),
    correctAnswer: z.string().trim().max(300).optional(),
    marks: z.coerce.number({ error: 'Marks are required' }).int().min(1, 'Marks must be at least 1').max(1000),
}).refine(
    (q) => q.type !== 'mcq' || (q.options && q.options.length >= 2),
    { message: 'An mcq question needs at least 2 options', path: ['options'] }
)

// question marks must sum to EXACTLY totalMarks sir — this is the schema-level half of the
// check; publishTest in controllers/Test.js re-checks the same rule as the hard gate, since
// updateTestSchema's fields are all optional and a partial patch might not carry both
// questions and totalMarks together for this refine to catch
const marksSumToTotal = (data) => {
    if (!data.questions || data.totalMarks === undefined) return true
    return data.questions.reduce((sum, q) => sum + q.marks, 0) === data.totalMarks
}
const marksSumIssue = { message: 'Question marks must add up to exactly the total marks', path: ['totalMarks'] }

const createTestSchema = z.object({
    job: objectId,
    title: z.string({ error: 'Title is required' }).trim().min(1, 'Title is required').max(150),
    description: z.string().trim().max(2000).optional(),
    questions: z.array(testQuestionSchema, { error: 'At least one question is required' }).min(1, 'At least one question is required').max(100),
    totalMarks: z.coerce.number({ error: 'Total marks are required' }).int().min(1),
    timeLimitMinutes: z.coerce.number().int().min(1).max(180),
    maxViolations: z.coerce.number().int().min(1).max(20).optional(),
}).refine(marksSumToTotal, marksSumIssue)

// same shape as create sir, but every field optional — a recruiter can patch just the title.
// `job` is deliberately NOT patchable — a test's job is set once at creation and never moves.
const updateTestSchema = z.object({
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    questions: z.array(testQuestionSchema).min(1).max(100).optional(),
    totalMarks: z.coerce.number().int().min(1).optional(),
    timeLimitMinutes: z.coerce.number().int().min(1).max(180).optional(),
    maxViolations: z.coerce.number().int().min(1).max(20).optional(),
}).refine(marksSumToTotal, marksSumIssue)

const submitAnswersSchema = z.object({
    answers: z.array(
        z.object({
            questionId: objectId,
            answer: z.string().trim().max(5000).optional(),
        })
    ),
})

const inviteCodeParamSchema = z.object({ inviteCode: z.string().trim().min(1, 'Invite code is required') })

const testIdParamSchema = z.object({ testId: objectId })

const attemptIdParamSchema = z.object({ attemptId: objectId })

// ---------------------------------------------------------------------------
// job postings sir
// ---------------------------------------------------------------------------

const employmentType = z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'], { error: 'Invalid employment type' })

const createJobSchema = z.object({
    companyName: z.string({ error: 'Company name is required' }).trim().min(1, 'Company name is required').max(150),
    title: z.string({ error: 'Title is required' }).trim().min(1, 'Title is required').max(150),
    description: z.string({ error: 'Description is required' }).trim().min(1, 'Description is required').max(5000),
    location: z.string().trim().max(150).optional(),
    employmentType: employmentType.optional(),
    skills: z.array(z.string().trim().max(60)).max(30).optional(),
})

const updateJobSchema = z.object({
    companyName: z.string().trim().min(1).max(150).optional(),
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    location: z.string().trim().max(150).optional(),
    employmentType: employmentType.optional(),
    skills: z.array(z.string().trim().max(60)).max(30).optional(),
})

const jobIdParamSchema = z.object({ jobId: objectId })

const applyToJobSchema = z.object({
    resume: objectId.optional(),
    builtResume: objectId.optional(),
})

const setApplicationOutcomeSchema = z.object({
    status: z.enum(['hired', 'rejected'], { error: 'Status must be hired or rejected' }),
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

// ---------------------------------------------------------------------------
// recruiter self-signup application sir — see User.recruiterApplication
// ---------------------------------------------------------------------------

// every field here is required sir — the Admin's approval judgment call (see
// approveRecruiterApplication) depends on having company name, website, size, location, and
// hiring needs up front, not a half-filled request
const recruiterApplicationSchema = z.object({
    companyName: z.string({ error: 'Company name is required' }).trim().min(1, 'Company name is required').max(150),
    companyWebsite: z.string({ error: 'Company website is required' }).trim().min(1, 'Company website is required').max(300)
        .refine((v) => /^https?:\/\/.+\..+/i.test(v), 'Please enter a valid website URL (e.g. https://example.com)'),
    companySize,
    location: z.string({ error: 'Location is required' }).trim().min(1, 'Location is required').max(150),
    hiringNeeds: z.string({ error: 'Please tell us your hiring needs' }).trim().min(1, 'Please tell us your hiring needs').max(2000),
})

const rejectRecruiterApplicationSchema = z.object({
    reason: z.string().trim().max(500).optional(),
})

// ---------------------------------------------------------------------------
// suspension appeal sir — see User.suspensionAppeal
// ---------------------------------------------------------------------------
const appealSuspensionSchema = z.object({
    message: z.string({ error: 'Please explain why your account should be un-suspended' }).trim()
        .min(1, 'Please explain why your account should be un-suspended').max(2000),
})

module.exports = {
    // primitives, exported so new schemas reuse the same rules sir
    email,
    phoneNumber,
    password,
    objectId,
    planKey,
    pagination,

    // auth
    createUserSchema,
    loginSchema,
    sendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,

    // account
    updateFirstNameSchema,
    updateLastNameSchema,
    updateEmailSchema,
    updateNumberSchema,
    notificationPrefsSchema,

    // payment
    createOrderSchema,
    verifyPaymentSchema,

    // admin
    updateUserRoleSchema,
    bulkUpdateRoleSchema,
    banUserSchema,
    bulkBanSchema,
    adjustCreditsSchema,
    grantCreditsToAllSchema,
    updateUserPlanSchema,
    userIdParamSchema,

    // recruiter proctored tests
    createTestSchema,
    updateTestSchema,
    submitAnswersSchema,
    inviteCodeParamSchema,
    testIdParamSchema,
    attemptIdParamSchema,

    // job postings
    createJobSchema,
    updateJobSchema,
    jobIdParamSchema,
    applyToJobSchema,
    setApplicationOutcomeSchema,
    bulkInviteApplicantsSchema,
    bulkApplicationOutcomeSchema,

    // recruiter self-signup application
    recruiterApplicationSchema,
    rejectRecruiterApplicationSchema,

    // suspension appeal
    appealSuspensionSchema,
}
