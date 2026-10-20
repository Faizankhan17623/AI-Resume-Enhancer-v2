// Auth schemas sir — signup, login, OTP, password reset/change, new-device alert. See
// controllers/user.js and Routes/Auth.js.

const { z } = require('zod')
const { email, phoneNumber, password, name, companySize } = require('./Shared')

const otp = z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => /^[0-9]{4,8}$/.test(v), 'Please enter a valid OTP')

// a confirm-password pair sir — the check that used to justify STORING a second bcrypt hash on
// the user document. It belongs here: it's a property of the submission, not of the user.
const withPasswordConfirmation = (schema, passwordField, confirmField) =>
    schema.refine((data) => data[passwordField] === data[confirmField], {
        message: 'Password and confirm password do not match',
        path: [confirmField],
    })

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

// User-Agent Client Hints sir, per direct request — genuinely optional (Firefox/Safari never
// send this, ResumeEnhancer/src/utils/clientHints.js returns null there), and purely advisory:
// see services/deviceAlertService.js's own comment on why this is never used for the actual
// new-device security decision, only shown as a labeled "self-reported" extra in the alert email.
const clientHintsSchema = z.object({
    brand: z.string().max(60).nullable().optional(),
    model: z.string().max(60).nullable().optional(),
    platform: z.string().max(60).nullable().optional(),
    mobile: z.boolean().nullable().optional(),
}).nullable().optional()

const loginSchema = z.object({
    email,
    // NOT the full policy sir — an existing account may predate it, and a policy-shaped error on
    // login would tell an attacker their guess was the wrong SHAPE rather than simply wrong
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
    clientHints: clientHintsSchema,
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

// new-device login alert sir — the confirm/deny link in the alert email carries this token
// (see services/deviceAlertService.js), not a user id, so the action can't be aimed at an
// arbitrary account by guessing/editing the query string
const deviceAlertResolveSchema = z.object({
    token: z.string({ error: 'A token is required' }).trim().min(1, 'A token is required'),
    action: z.enum(['confirm', 'deny'], { error: 'Action must be confirm or deny' }),
})

module.exports = {
    createUserSchema,
    loginSchema,
    sendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    deviceAlertResolveSchema,
}
