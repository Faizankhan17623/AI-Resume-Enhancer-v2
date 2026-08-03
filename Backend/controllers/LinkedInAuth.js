// LinkedIn OAuth sir — see services/oauth.js for all the shared flow logic.
// LinkedIn's /v2/userinfo is OpenID-shaped, so this reads almost identically to Google.

const { createOAuthController } = require('../services/oauth')
const logger = require('../utils/logger')

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo'

const linkedin = createOAuthController({
    name: 'linkedin',
    label: 'LinkedIn',
    stateCookie: 'li_oauth_state',

    authUrl: (state) => `${LINKEDIN_AUTH_URL}?${new URLSearchParams({
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        response_type: 'code',
        scope: 'openid profile email',
        state,
    })}`,

    getAccessToken: async (code) => {
        const res = await fetch(LINKEDIN_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
                grant_type: 'authorization_code',
            }),
        })

        if (!res.ok) {
            logger.warn('LinkedIn token exchange failed', { body: await res.text() })
            return null
        }

        const { access_token } = await res.json()
        return access_token
    },

    getProfile: async (accessToken) => {
        const res = await fetch(LINKEDIN_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
            logger.warn('LinkedIn userinfo fetch failed', { body: await res.text() })
            return null
        }

        const profile = await res.json()

        if (!profile.email_verified) {
            return { reason: 'Your LinkedIn email is not verified, please verify it with LinkedIn first' }
        }

        return {
            providerId: profile.sub,
            email: profile.email,
            firstName: profile.given_name || profile.name || 'LinkedIn',
            lastName: profile.family_name || 'User',
        }
    },
})

exports.linkedinLogin = linkedin.login
exports.linkedinCallback = linkedin.callback
exports.exchangeLinkedInCode = linkedin.exchange
