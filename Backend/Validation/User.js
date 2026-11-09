// User account schemas sir — profile edits, notification prefs, suspension appeal. See
// controllers/user.js and Models/User.js.

const { z } = require('zod')
const { email, phoneNumber, name } = require('./Shared')

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
    // was missing sir, per 2026-11-09 audit — Account.jsx sends { notifyInterviewPrep: value }
    // alone when this one toggle is flipped. Since validate() strips unknown keys by default
    // (Zod non-passthrough), the controller received {}, hit its "no fields" guard, and the
    // toggle silently never saved. The field exists on Models/User.js, it was just never added
    // here.
    notifyInterviewPrep: z.boolean().optional(),
    notifyNewApplicant: z.boolean().optional(),
})

// suspension appeal sir — see User.suspensionAppeal
const appealSuspensionSchema = z.object({
    message: z.string({ error: 'Please explain why your account should be un-suspended' }).trim()
        .min(1, 'Please explain why your account should be un-suspended').max(2000),
})

module.exports = {
    updateFirstNameSchema,
    updateLastNameSchema,
    updateEmailSchema,
    updateNumberSchema,
    notificationPrefsSchema,
    appealSuspensionSchema,
}
