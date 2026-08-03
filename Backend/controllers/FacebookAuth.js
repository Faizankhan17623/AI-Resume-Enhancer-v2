// Facebook OAuth sir — see services/oauth.js for all the shared flow logic.
// Facebook's Graph API takes the access token as a query parameter rather than a bearer header,
// and returns first_name/last_name directly.

const { createOAuthController } = require('../services/oauth')
const logger = require('../utils/logger')

const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'
const FACEBOOK_USERINFO_URL = 'https://graph.facebook.com/me'

const facebook = createOAuthController({
    name: 'facebook',
    label: 'Facebook',
    stateCookie: 'fb_oauth_state',

    authUrl: (state) => `${FACEBOOK_AUTH_URL}?${new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID,
        redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        response_type: 'code',
        scope: 'email public_profile',
        state,
    })}`,

    getAccessToken: async (code) => {
        const params = new URLSearchParams({
            code,
            client_id: process.env.FACEBOOK_CLIENT_ID,
            client_secret: process.env.FACEBOOK_CLIENT_SECRET,
            redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        })

        const res = await fetch(`${FACEBOOK_TOKEN_URL}?${params}`)

        if (!res.ok) {
            logger.warn('Facebook token exchange failed', { body: await res.text() })
            return null
        }

        const { access_token } = await res.json()
        return access_token
    },

    getProfile: async (accessToken) => {
        const params = new URLSearchParams({
            fields: 'id,first_name,last_name,email',
            access_token: accessToken,
        })

        const res = await fetch(`${FACEBOOK_USERINFO_URL}?${params}`)

        if (!res.ok) {
            logger.warn('Facebook userinfo fetch failed', { body: await res.text() })
            return null
        }

        const profile = await res.json()

        // email is optional on Facebook sir — the user can decline that permission
        if (!profile.email) {
            return { reason: 'Please grant email access to continue with Facebook sign-in' }
        }

        return {
            providerId: profile.id,
            email: profile.email,
            firstName: profile.first_name || 'Facebook',
            lastName: profile.last_name || 'User',
        }
    },
})

exports.facebookLogin = facebook.login
exports.facebookCallback = facebook.callback
exports.exchangeFacebookCode = facebook.exchange
