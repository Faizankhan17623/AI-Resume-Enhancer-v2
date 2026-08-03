// GitHub OAuth sir — see services/oauth.js for all the shared flow logic.
// GitHub differs from the OpenID providers in two ways: it needs a User-Agent header on every
// API call, and its /user endpoint usually omits the email, so that needs a second request.

const { createOAuthController } = require('../services/oauth')
const logger = require('../utils/logger')

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'

// GitHub's API 403s any request without a User-Agent sir
const GITHUB_HEADERS = { 'User-Agent': 'AiResumeEnhancer' }

const github = createOAuthController({
    name: 'github',
    label: 'GitHub',
    stateCookie: 'gh_oauth_state',

    authUrl: (state) => `${GITHUB_AUTH_URL}?${new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'read:user user:email',
        state,
    })}`,

    getAccessToken: async (code) => {
        const res = await fetch(GITHUB_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                ...GITHUB_HEADERS,
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                redirect_uri: process.env.GITHUB_CALLBACK_URL,
            }),
        })

        if (!res.ok) {
            logger.warn('GitHub token exchange failed', { body: await res.text() })
            return null
        }

        // GitHub returns 200 with an { error } body on failure sir, not an HTTP error status
        const body = await res.json()
        if (body.error || !body.access_token) {
            logger.warn('GitHub token exchange error', { error: body.error })
            return null
        }

        return body.access_token
    },

    getProfile: async (accessToken) => {
        const authHeaders = { Authorization: `Bearer ${accessToken}`, ...GITHUB_HEADERS }

        const res = await fetch(GITHUB_USER_URL, { headers: authHeaders })

        if (!res.ok) {
            logger.warn('GitHub userinfo fetch failed', { body: await res.text() })
            return null
        }

        const profile = await res.json()

        // /user omits email unless the user made it public sir — fall back to /user/emails and
        // take the primary verified one
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
            return { reason: 'Please make an email address available on GitHub to continue' }
        }

        // GitHub gives one free-text display name sir, not given/family parts
        const nameParts = (profile.name || profile.login || 'GitHub User').trim().split(/\s+/)

        return {
            providerId: profile.id,
            email,
            firstName: nameParts[0] || 'GitHub',
            lastName: nameParts.slice(1).join(' ') || 'User',
        }
    },
})

exports.githubLogin = github.login
exports.githubCallback = github.callback
exports.exchangeGitHubCode = github.exchange
