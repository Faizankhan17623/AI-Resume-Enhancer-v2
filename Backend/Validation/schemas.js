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

const createUserSchema = z.object({
    firstName: name('First name'),
    lastName: name('Last name'),
    email,
    password,
    number: phoneNumber,
    Code: z.string({ error: 'Country code is required' }).trim().min(1, 'Country code is required'),
    otp,
})

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

const roleSchema = z.enum(['User', 'Support', 'Admin'], { error: 'Invalid role' })

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
})

const updateUserPlanSchema = z.object({
    plan: planKey,
})

const userIdParamSchema = z.object({ userId: objectId })

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
    updateUserPlanSchema,
    userIdParamSchema,
}
