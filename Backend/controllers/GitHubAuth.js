const jwt = require('jsonwebtoken')
const cookie = require('cookie')
const crypto = require('crypto')
const bcrypt = require('bcrypt')

const User = require('../Models/User')
const LoginLog = require('../Models/LoginLog')

// every OAuth-created account gets this same placeholder password hashed in sir — it's never
// shown or usable for a real password login (existingUser.password truthy just routes them to
// "use Continue with Google/GitHub/etc instead" in loginUser), it only exists to satisfy the
// 8-char-minimum password field the schema expects a fully-populated account to carry
const OAUTH_DEFAULT_PASSWORD = 'Oauth123'

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'

// short-lived, single-use exchange codes sir — same pattern as GoogleAuth.js, the real JWT
// never touches the redirect URL, only this random opaque code does. 5 minutes (not 60s) sir
// — see GoogleAuth.js for why: Render's free-tier cold start plus the user clicking through
// the provider's consent screen easily exceeds 60 seconds
const EXCHANGE_TTL_MS = 5 * 60 * 1000
const pendingExchanges = new Map() // code -> { payload, expiresAt }

const createExchangeCode = (payload) => {
    const code = crypto.randomBytes(24).toString('base64url')
    pendingExchanges.set(code, { payload, expiresAt: Date.now() + EXCHANGE_TTL_MS })
    return code
}

const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

// GitHub's API requires a User-Agent header on every request sir, otherwise it 403s
const GITHUB_HEADERS = { 'User-Agent': 'AiResumeEnhancer' }

// GET /auth/github
exports.githubLogin = (req, res) => {
    const state = crypto.randomBytes(16).toString('hex')

    res.setHeader('Set-Cookie', cookie.stringifySetCookie({
        name: 'gh_oauth_state',
        value: state,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
        path: '/',
    }))

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'read:user user:email',
        state,
    })

    return res.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`)
}

// GET /auth/github/callback
exports.githubCallback = async (req, res) => {
    const failRedirect = (message) => res.redirect(`${frontendOrigin()}/Login?oauthError=${encodeURIComponent(message)}`)

    try {
        const { code, state } = req.query
        const cookieState = req.cookies?.gh_oauth_state

        if (!code || !state || !cookieState || state !== cookieState) {
            return failRedirect('GitHub sign-in could not be verified, please try again')
        }

        const tokenRes = await fetch(GITHUB_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...GITHUB_HEADERS },
            body: new URLSearchParams({
                code,
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                redirect_uri: process.env.GITHUB_CALLBACK_URL,
            }),
        })

        if (!tokenRes.ok) {
            console.log('GitHub token exchange failed:', await tokenRes.text())
            return failRedirect('GitHub sign-in failed, please try again')
        }

        const tokenBody = await tokenRes.json()
        const { access_token, error } = tokenBody

        if (error || !access_token) {
            console.log('GitHub token exchange error:', tokenBody)
            return failRedirect('GitHub sign-in failed, please try again')
        }

        const authHeaders = { Authorization: `Bearer ${access_token}`, ...GITHUB_HEADERS }

        const profileRes = await fetch(GITHUB_USER_URL, { headers: authHeaders })

        if (!profileRes.ok) {
            console.log('GitHub userinfo fetch failed:', await profileRes.text())
            return failRedirect('GitHub sign-in failed, please try again')
        }

        const profile = await profileRes.json()
        // profile: { id, login, name, email? (often null unless set public) }

        // GitHub's /user endpoint often omits email sir — fall back to /user/emails and
        // pick the primary, verified one
        let email = profile.email
        if (!email) {
            const emailsRes = await fetch(GITHUB_EMAILS_URL, { headers: authHeaders })
            if (emailsRes.ok) {
                const emails = await emailsRes.json()
                const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified)
                email = primary?.email
            }
        }

        if (!email) {
            return failRedirect('Please make an email address available on GitHub to continue')
        }

        email = email.toLowerCase().trim()

        // account linking sir — identical logic to GoogleAuth.js
        let user = await User.findOne({ provider: 'github', providerId: String(profile.id) })

        if (!user) {
            user = await User.findOne({ email })

            if (user) {
                if (user.provider === 'local') {
                    user.providerId = String(profile.id)
                    await user.save()
                }
            } else {
                const nameParts = (profile.name || profile.login || 'GitHub User').trim().split(/\s+/)
                let firstName = (nameParts[0] || 'GitHub').slice(0, 50)
                const lastName = (nameParts.slice(1).join(' ') || 'User').slice(0, 50)

                const collision = await User.findOne({ firstName })
                if (collision) {
                    firstName = `${firstName}${crypto.randomBytes(2).toString('hex')}`
                }

                const defaultPasswordHash = await bcrypt.hash(OAUTH_DEFAULT_PASSWORD, 10)

                user = await User.create({
                    firstName,
                    lastName,
                    email,
                    password: defaultPasswordHash,
                    confirmpassword: defaultPasswordHash,
                    provider: 'github',
                    providerId: String(profile.id),
                    Verified: true,
                })
            }
        }

        if (user.isBanned) {
            return failRedirect(user.banReason ? `Your account has been suspended: ${user.banReason}` : 'Your account has been suspended')
        }

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
            cookie.stringifySetCookie({ name: 'gh_oauth_state', value: '', maxAge: 0, path: '/' }),
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

        const exchangeCode = createExchangeCode({
            token: jwtToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                SubType: user.SubType,
            },
        })

        return res.redirect(`${frontendOrigin()}/oauth/complete?code=${exchangeCode}&provider=github`)
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return failRedirect('Something went wrong during GitHub sign-in')
    }
}

// POST /auth/github/exchange
exports.exchangeGitHubCode = (req, res) => {
    const { code } = req.body

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing exchange code' })
    }

    const pending = pendingExchanges.get(code)
    pendingExchanges.delete(code)

    if (!pending || pending.expiresAt < Date.now()) {
        return res.status(400).json({ success: false, message: 'This sign-in link has expired, please try again' })
    }

    return res.status(200).json({
        success: true,
        token: pending.payload.token,
        user: pending.payload.user,
    })
}
