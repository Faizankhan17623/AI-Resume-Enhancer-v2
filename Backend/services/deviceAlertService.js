// New-device login alert sir — the whole feature lives in this one service so it has exactly
// ONE call site's worth of behavior to reason about, shared by both places a session gets
// minted: controllers/user.js's loginUser (password) and services/oauth.js's callback (all four
// OAuth providers funnel through that one function already, see its own header comment).
//
// Scope: 'User' and 'Recruiter' accounts only sir, per the product decision — Admin is a single
// account and Support was never part of this ask either.

const crypto = require('crypto')
const User = require('../Models/User')
const KnownDevice = require('../Models/KnownDevice')
const DeviceAlertToken = require('../Models/DeviceAlertToken')
const { buildDeviceHash, fingerprintRequest } = require('../utils/deviceFingerprint')
const { lookupIpLocation } = require('../utils/ipGeoLookup')
const mailSender = require('../utils/Nodemailer')
const { newDeviceAlertTemplate } = require('../Templates/newDeviceAlertTemplate')
const { passwordResetTemplate } = require('../Templates/passwordResetTemplate')
const logger = require('../utils/logger')

const ALERT_ELIGIBLE_ROLES = ['User', 'Recruiter']

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours sir — long enough to reach an inbox and act,
// short enough that a stale, unactioned alert can't be replayed indefinitely

const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

const mintDeviceAlertToken = async (userId, deviceHash) => {
    const token = crypto.randomBytes(24).toString('hex')
    await DeviceAlertToken.create({
        token,
        user: userId,
        deviceHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    })
    return token
}

/**
 * Call this AFTER a login has already succeeded (password or OAuth) and the session is about to
 * be issued sir — never call it before the login is verified, this is a notification step, not a
 * gate. Fire-and-forget from the caller's point of view: every failure inside here is caught and
 * logged, NEVER thrown, because a device-check hiccup must not be able to block a real login —
 * same discipline as LoginLog.create's own fire-and-forget call right next to this one.
 */
const checkAndAlertNewDevice = async (user, req) => {
    try {
        if (!ALERT_ELIGIBLE_ROLES.includes(user.role)) return

        const { browserLabel, osLabel, ip } = fingerprintRequest(req)
        const deviceHash = buildDeviceHash(user._id, browserLabel, osLabel)

        const existing = await KnownDevice.findOne({ user: user._id, deviceHash })
        if (existing) {
            await KnownDevice.updateOne(
                { _id: existing._id },
                { lastSeenAt: new Date(), lastIp: ip }
            )
            return
        }

        // no row for THIS device sir — is this the user's very first device ever, or a genuinely
        // new one alongside others already on file? Only the latter is worth an email: a brand
        // new signup's first login being flagged as "suspicious" would just read as a broken
        // welcome experience, not a security feature.
        const hasAnyDevice = await KnownDevice.exists({ user: user._id })

        await KnownDevice.create({
            user: user._id,
            deviceHash,
            browserLabel,
            osLabel,
            lastIp: ip,
        })

        if (!hasAnyDevice) return // first device ever sir — registered silently, no alert

        const token = await mintDeviceAlertToken(user._id, deviceHash)
        const location = await lookupIpLocation(ip) // null-safe, never throws

        const confirmUrl = `${frontendOrigin()}/device-confirm?token=${token}&action=confirm`
        const denyUrl = `${frontendOrigin()}/device-confirm?token=${token}&action=deny`

        await mailSender(
            user.email,
            'New sign-in to your account',
            newDeviceAlertTemplate(
                `${user.firstName} ${user.lastName}`,
                {
                    browserLabel,
                    osLabel,
                    location,
                    ip,
                    when: new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC',
                },
                confirmUrl,
                denyUrl
            )
        )
    } catch (error) {
        // never let a device-check failure surface to the caller sir — see the function comment
        logger.error('new-device alert check failed', { err: error, userId: user?._id })
    }
}

/**
 * Handles a click on either button in the new-device alert email sir. Returns a RESULT rather
 * than writing a response — same shape convention as fitScoreService.js/reviewService.js — so
 * the HTTP layer in controllers/user.js stays a thin translation to status codes.
 *
 * 'confirm': the device is already registered (it was written to KnownDevice at alert-send time,
 * see checkAndAlertNewDevice above) — this click just consumes the token so it can't be reused,
 * nothing else needs to change.
 *
 * 'deny': deliberately does NOT touch tokenVersion or KnownDevice directly here. Instead it
 * generates a real password-reset token and sends the EXACT SAME reset-password email the
 * forgot-password flow sends — reusing that flow means the existing resetPassword controller's
 * own tokenVersion bump + token:null (which kills every session, everywhere) fires the moment
 * the user actually sets a new password, not before. Force-killing the session at the "no, it
 * wasn't me" click instead would lock the real account owner out immediately, before they've had
 * any chance to reset — a worse outcome than leaving the (already-flagged) session alone for the
 * few minutes it takes to open the follow-up email and reset.
 */
const resolveDeviceAlert = async (token, action) => {
    const record = await DeviceAlertToken.findOne({ token })
    if (!record || record.expiresAt < new Date()) {
        return { ok: false, status: 400, message: 'This link has expired or was already used' }
    }

    // single-use sir — delete immediately on any resolution, confirm or deny alike
    await DeviceAlertToken.deleteOne({ _id: record._id })

    if (action === 'confirm') {
        return { ok: true, action: 'confirm', message: 'Thanks for confirming — no action needed' }
    }

    if (action === 'deny') {
        const user = await User.findById(record.user)
        if (!user) {
            return { ok: false, status: 404, message: 'Account not found' }
        }

        // same reset-token shape as forgotPassword in controllers/user.js sir — one hour to use it
        const resetToken = crypto.randomBytes(20).toString('hex')
        await User.findByIdAndUpdate(user._id, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: Date.now() + 3600000,
        })

        const url = `${frontendOrigin()}/reset-password/${resetToken}`
        try {
            await mailSender(
                user.email,
                'Reset Your Password',
                passwordResetTemplate(`${user.firstName} ${user.lastName}`, url)
            )
        } catch (mailError) {
            logger.error('device-deny reset email delivery failed', { err: mailError, userId: user._id })
        }

        return { ok: true, action: 'deny', message: 'A password reset link is on its way to your email — resetting it will sign out every other device' }
    }

    return { ok: false, status: 400, message: 'Unrecognized action' }
}

module.exports = { checkAndAlertNewDevice, resolveDeviceAlert, ALERT_ELIGIBLE_ROLES }
