// Google OAuth sir — only the Google-specific bits live here. Every shared decision (CSRF state,
// account linking + the takeover guard, ban/deletion checks, session issuing, login logging,
// one-time exchange code) is in services/oauth.js and is identical across all four providers.

const { createOAuthController } = require('../services/oauth')
const logger = require('../utils/logger')

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

const google = createOAuthController({
    name: 'google',
    label: 'Google',
    stateCookie: 'oauth_state',

    authUrl: (state) => `${GOOGLE_AUTH_URL}?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
    })}`,

    getAccessToken: async (code) => {
        const res = await fetch(GOOGLE_TOKEN_URL, {
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

        if (!res.ok) {
            logger.warn('Google token exchange failed', { body: await res.text() })
            return null
        }

        const { access_token } = await res.json()
        return access_token
    },

    // pull the identity from Google's userinfo endpoint sir — never trust an unverified id_token
    // payload without checking its signature; fetching with the access token is simpler and
    // equally safe
    getProfile: async (accessToken) => {
        const res = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
            logger.warn('Google userinfo fetch failed', { body: await res.text() })
            return null
        }

        const profile = await res.json()

        if (!profile.email_verified) {
            return { reason: 'Your Google email is not verified, please verify it with Google first' }
        }

        return {
            providerId: profile.sub,
            email: profile.email,
            firstName: profile.given_name || profile.name || 'Google',
            lastName: profile.family_name || 'User',
        }
    },
})

exports.googleLogin = google.login
exports.googleCallback = google.callback
exports.exchangeGoogleCode = google.exchange
