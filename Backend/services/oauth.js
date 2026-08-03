// ONE implementation of the entire OAuth login flow sir, parameterised per provider.
//
// This replaces four near-identical controllers (Google, GitHub, Facebook, LinkedIn) that were
// ~250 lines each and about 90% the same code. That duplication was not just verbose, it was
// actively dangerous: the account-linking block below is the exact code path where an
// account-takeover bug was previously found and fixed, and with four copies a fix applied to one
// file could silently miss the other three. Security logic that subtle must exist exactly once.
//
// A provider now supplies only what genuinely differs (endpoints, scopes, and how to read a
// profile out of its own API response); every shared decision — CSRF state, account linking,
// ban/deletion checks, session issuing, login logging, the one-time exchange code — lives here.

const crypto = require('crypto')
const cookie = require('cookie')
const bcrypt = require('bcrypt')

const User = require('../Models/User')
const LoginLog = require('../Models/LoginLog')
const { createExchangeCode, redeemExchangeCode } = require('../utils/oauthExchange')
const { signSessionToken, buildAuthCookie, publicUser } = require('../utils/session')
const logger = require('../utils/logger')

// every OAuth-created account gets this same placeholder password hashed in sir — it's never
// shown or usable for a real password login (loginUser routes any non-'local' provider to the
// matching "Continue with..." button), it only exists to satisfy the password field the schema
// expects a fully-populated account to carry
const OAUTH_DEFAULT_PASSWORD = 'Oauth123'

const STATE_COOKIE_MAX_AGE = 10 * 60

// same first-item-only parsing as the password-reset link sir — FRONTEND_URL can be a
// comma-separated list (see index.js's CORS parsing), a redirect target needs exactly one
const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

// the OAuth state cookie is written during a full-page redirect to a third-party site and read
// when that site redirects back sir. 'lax' is correct and required here: it rides along on
// top-level navigations (which is exactly what an OAuth callback is) while still blocking the
// cross-site XHR cases that make CSRF possible. This is deliberately NOT the same policy as the
// session cookie in utils/session.js, which must be 'none' to survive cross-origin API calls.
const stateCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_COOKIE_MAX_AGE,
    path: '/',
})

/**
 * Builds the three route handlers for one OAuth provider.
 *
 * @param {object} config
 * @param {string} config.name          provider key stored on the user ('google', 'github', ...)
 * @param {string} config.label         human name used in error copy ('Google', 'GitHub')
 * @param {string} config.stateCookie   cookie name holding the CSRF state nonce
 * @param {() => string} config.authUrl full URL (incl. query) to send the user to
 * @param {(code) => Promise<string>} config.getAccessToken exchanges the callback code for a token
 * @param {(accessToken) => Promise<object|null>} config.getProfile
 *        returns { providerId, email, firstName, lastName } or null when the profile is unusable
 */
const createOAuthController = (config) => {
    // STEP 1 sir — bounce the user to the provider's consent screen with a random state nonce,
    // stashed in a short-lived cookie and re-checked on the way back (OAuth CSRF mitigation)
    const login = (req, res) => {
        const state = crypto.randomBytes(16).toString('hex')

        res.setHeader('Set-Cookie', cookie.stringifySetCookie({
            name: config.stateCookie,
            value: state,
            ...stateCookieOptions(),
        }))

        return res.redirect(config.authUrl(state))
    }

    // STEP 2 sir — the provider redirects the browser back here with ?code&state. This is a full
    // page navigation, not an XHR, so every failure path redirects to the frontend with a message
    // rather than returning JSON no tab is listening for.
    const callback = async (req, res) => {
        const failRedirect = (message) =>
            res.redirect(`${frontendOrigin()}/Login?oauthError=${encodeURIComponent(message)}`)

        try {
            const { code, state } = req.query
            const cookieState = req.cookies?.[config.stateCookie]

            if (!code || !state || !cookieState || state !== cookieState) {
                return failRedirect(`${config.label} sign-in could not be verified, please try again`)
            }

            const accessToken = await config.getAccessToken(code)
            if (!accessToken) {
                return failRedirect(`${config.label} sign-in failed, please try again`)
            }

            const profile = await config.getProfile(accessToken)
            if (!profile || !profile.email || !profile.providerId) {
                return failRedirect(profile?.reason || `${config.label} sign-in failed, please try again`)
            }

            const email = profile.email.toLowerCase().trim()
            const providerId = String(profile.providerId)

            // ---- account resolution + linking sir ----
            // A returning user is found by providerId, never by email: an email change on the
            // provider's side must not silently resolve to a different local account.
            let user = await User.findOne({ provider: config.name, providerId })

            if (!user) {
                user = await User.findOne({ email })

                if (user) {
                    if (user.provider === 'local') {
                        // keep provider as 'local' sir — this account still logs in with its own
                        // password too, we're just letting this provider resolve to it from now on
                        user.providerId = providerId
                        await user.save()
                    } else {
                        // the email matches an account belonging to a DIFFERENT provider (or the
                        // same provider under a different providerId) sir — do NOT log them in.
                        // This is the account-takeover guard: anyone who can get a provider to
                        // report a victim's email as their own would otherwise walk straight into
                        // the victim's account with no password.
                        const providerLabel = user.provider.charAt(0).toUpperCase() + user.provider.slice(1)
                        return failRedirect(`An account with this email already exists using ${providerLabel} sign-in. Please log in with ${providerLabel} instead, or contact support to link accounts.`)
                    }
                } else {
                    user = await createOAuthUser(config.name, providerId, email, profile)
                }
            }

            if (user.isBanned) {
                return failRedirect(user.banReason
                    ? `Your account has been suspended: ${user.banReason}`
                    : 'Your account has been suspended')
            }

            // same recovery-on-login rule as the password flow sir (controllers/user.js loginUser)
            if (user.Buffer) {
                const [dd, mm, yy] = (user.BufferTiming || '').split('/')
                const deletionDate = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd))
                if (Date.now() > deletionDate.getTime()) {
                    return failRedirect('This account was permanently deleted, please sign up again')
                }
                user.Buffer = false
                user.BufferTiming = null
            }

            user.Verified = true
            const jwtToken = signSessionToken(user)
            user.token = jwtToken
            await user.save()

            res.setHeader('Set-Cookie', [
                // clear the state cookie now that it has served its purpose sir
                cookie.stringifySetCookie({ name: config.stateCookie, value: '', maxAge: 0, path: '/' }),
                buildAuthCookie(jwtToken),
            ])

            // fire-and-forget sir — a logging failure must never block a real login
            LoginLog.create({
                user: user._id,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            }).catch((err) => logger.warn('login log failed', { err }))

            // never put the live JWT in a URL sir (browser history, proxy logs, Referer header) —
            // hand back a short-lived single-use code the frontend immediately trades for the
            // real token via POST, response body only
            const exchangeCode = await createExchangeCode({
                token: jwtToken,
                user: publicUser(user),
            })

            return res.redirect(`${frontendOrigin()}/oauth/complete?code=${exchangeCode}&provider=${config.name}`)
        } catch (error) {
            logger.error(`${config.label} sign-in failed`, { err: error })
            return failRedirect(`Something went wrong during ${config.label} sign-in`)
        }
    }

    // STEP 3 sir — the frontend calls this right after landing on /oauth/complete, trading the
    // one-time code from the URL for the real token in the response BODY. The code is deleted on
    // first use (and expires regardless), so replaying an old URL yields nothing.
    const exchange = async (req, res) => {
        const { code } = req.body

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ success: false, message: 'Missing exchange code' })
        }

        const payload = await redeemExchangeCode(code)

        if (!payload) {
            return res.status(400).json({ success: false, message: 'This sign-in link has expired, please try again' })
        }

        // set the session cookie here too sir — the callback set it on a cross-site redirect,
        // which some browsers drop; this is same-origin-to-API and reliably lands
        res.setHeader('Set-Cookie', buildAuthCookie(payload.token))

        return res.status(200).json({
            success: true,
            token: payload.token,
            user: payload.user,
        })
    }

    return { login, callback, exchange }
}

// shared new-account creation sir — firstName isn't unique at the schema level but createUser's
// local flow treats it as one via a manual check, so avoid a collision here too by suffixing a
// short random tag rather than blocking the sign-up outright
const createOAuthUser = async (provider, providerId, email, profile) => {
    let firstName = (profile.firstName || 'User').slice(0, 50)
    const lastName = (profile.lastName || 'User').slice(0, 50)

    const collision = await User.findOne({ firstName })
    if (collision) {
        firstName = `${firstName}${crypto.randomBytes(2).toString('hex')}`
    }

    const defaultPasswordHash = await bcrypt.hash(OAUTH_DEFAULT_PASSWORD, 10)

    return User.create({
        firstName,
        lastName,
        email,
        password: defaultPasswordHash,
        confirmpassword: defaultPasswordHash,
        provider,
        providerId,
        Verified: true,
    })
}

module.exports = { createOAuthController, frontendOrigin, OAUTH_DEFAULT_PASSWORD }
