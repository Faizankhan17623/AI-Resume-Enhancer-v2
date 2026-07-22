const jwt = require('jsonwebtoken')
const cookie = require('cookie')
const crypto = require('crypto')

const User = require('../Models/User')
const LoginLog = require('../Models/LoginLog')

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

// same first-item-only parsing as the password-reset link sir — FRONTEND_URL can be a
// comma-separated list (see index.js's CORS parsing), a redirect target needs exactly one
const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

// GET /auth/google — kicks off the redirect to Google's consent screen sir. `state` is a
// random nonce stored in a short-lived signed cookie, checked on the way back so a forged
// callback request can't complete a login (standard OAuth CSRF mitigation)
exports.googleLogin = (req, res) => {
    const state = crypto.randomBytes(16).toString('hex')

    res.setHeader('Set-Cookie', cookie.stringifySetCookie({
        name: 'oauth_state',
        value: state,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
        path: '/',
    }))

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
    })

    return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
}

// GET /auth/google/callback — Google redirects here with ?code&state sir. This is a full
// page navigation (not an XHR), so every failure path below redirects back to the frontend
// with an error rather than returning JSON no browser tab is listening for.
exports.googleCallback = async (req, res) => {
    const failRedirect = (message) => res.redirect(`${frontendOrigin()}/Login?oauthError=${encodeURIComponent(message)}`)

    try {
        const { code, state } = req.query
        const cookieState = req.cookies?.oauth_state

        if (!code || !state || !cookieState || state !== cookieState) {
            return failRedirect('Google sign-in could not be verified, please try again')
        }

        // exchange the one-time code for tokens sir
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code',
            }),
        })

        if (!tokenRes.ok) {
            console.log('Google token exchange failed:', await tokenRes.text())
            return failRedirect('Google sign-in failed, please try again')
        }

        const { access_token } = await tokenRes.json()

        // pull the actual identity off Google's userinfo endpoint sir — never trust an
        // unverified id_token payload without checking its signature, fetching this way
        // (with the access token) is the simpler, equally-safe alternative
        const profileRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${access_token}` },
        })

        if (!profileRes.ok) {
            console.log('Google userinfo fetch failed:', await profileRes.text())
            return failRedirect('Google sign-in failed, please try again')
        }

        const profile = await profileRes.json()
        // profile: { sub, email, email_verified, given_name, family_name, name, picture }

        if (!profile.email_verified) {
            return failRedirect('Your Google email is not verified, please verify it with Google first')
        }

        const email = profile.email.toLowerCase().trim()

        // account linking sir: an existing 'local' user signing in with Google for the first
        // time gets their account upgraded to also carry a providerId — same person, same
        // email, no duplicate account created. A returning Google user is found by providerId
        // directly (an email change on Google's side should never silently take over a
        // different local account).
        let user = await User.findOne({ provider: 'google', providerId: profile.sub })

        if (!user) {
            user = await User.findOne({ email })

            if (user) {
                if (user.provider === 'local') {
                    user.providerId = profile.sub
                    await user.save()
                }
                // else: a different Google account already claims this email — fall through,
                // `user` still resolves and logs them into the SAME account either way, which
                // is correct since email is unique in this schema (only one User can hold it)
            } else {
                // brand-new account sir — derive names from Google's profile, falling back
                // to something sane if Google ever omits given/family name
                let firstName = (profile.given_name || profile.name || 'Google').slice(0, 50)
                const lastName = (profile.family_name || 'User').slice(0, 50)

                // firstName isn't unique at the schema level, but createUser's local flow
                // treats it as one via a manual check sir — avoid a collision for OAuth
                // signups too by suffixing a short random tag rather than blocking sign-in
                const collision = await User.findOne({ firstName })
                if (collision) {
                    firstName = `${firstName}${crypto.randomBytes(2).toString('hex')}`
                }

                user = await User.create({
                    firstName,
                    lastName,
                    email,
                    provider: 'google',
                    providerId: profile.sub,
                    Verified: true,
                })
            }
        }

        if (user.isBanned) {
            return failRedirect(user.banReason ? `Your account has been suspended: ${user.banReason}` : 'Your account has been suspended')
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
        const jwtToken = jwt.sign(
            { id: user._id, firstName: user.firstName, lastName: user.lastName },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: 7 * 24 * 60 * 60 }
        )
        user.token = jwtToken
        await user.save()

        res.setHeader('Set-Cookie', [
            // clear the short-lived state cookie now that it's served its purpose sir
            cookie.stringifySetCookie({ name: 'oauth_state', value: '', maxAge: 0, path: '/' }),
            cookie.stringifySetCookie({
                name: 'token',
                value: jwtToken,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60,
                path: '/',
            }),
        ])

        LoginLog.create({
            user: user._id,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        }).catch((err) => console.log('login log failed:', err.message))

        // the frontend reads token+user off the URL once, same shape LoginUser already
        // stores in redux/localStorage, then strips them from the address bar sir
        const userPayload = encodeURIComponent(JSON.stringify({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            SubType: user.SubType,
        }))

        return res.redirect(`${frontendOrigin()}/oauth/complete?token=${jwtToken}&user=${userPayload}`)
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return failRedirect('Something went wrong during Google sign-in')
    }
}
