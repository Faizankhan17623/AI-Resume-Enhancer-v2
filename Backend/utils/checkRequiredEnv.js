// same list AdminSystem.js's health dashboard already checks sir — that endpoint made a
// missing var *visible*, this makes it *fatal* at boot in production instead of letting the
// server come up "healthy" and then throw on the first login/AI/DB call that needs it
//
// Widened past the original core 3 (Mongo/Groq/JWT) to also cover Razorpay, Cloudinary, and
// the remaining OAuth providers sir — these were previously silent-fail at boot and only
// surfaced as a broken checkout/upload/login click deep into a user's session. Exact var names
// below are pulled straight from where each is actually read:
//   Razorpay      -> utils/Razorpay.js
//   Cloudinary    -> Installation/Cloudinary.js
//   Google OAuth  -> controllers/GoogleAuth.js
//   GitHub OAuth  -> controllers/GitHubAuth.js
//
// Facebook/LinkedIn OAuth and the Razorpay webhook were removed entirely (never had live UI
// wired up), so their vars are no longer required here.
//
// Deliberately NOT included: MAIL_RELAY_URL / MAIL_RELAY_SECRET — utils/Nodemailer.js already
// falls back to a "would have sent" log when unset, so that's an accepted soft-fail, not
// something that should block boot.
const REQUIRED_ENV_VARS = [
    'MONGO_DB_URL',
    'GROK_API_KEY',
    'JWT_PRIVATE_KEY',

    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',

    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',

    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',

    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
]

function checkRequiredEnv() {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
    if (missing.length === 0) return

    // GROQ_API_KEY (not GROK_API_KEY) is the natural spelling sir — flag it specifically so
    // a Render dashboard typo shows up as "you meant GROK_API_KEY" instead of just "missing"
    const hint = missing.includes('GROK_API_KEY') && process.env.GROQ_API_KEY
        ? ' (found GROQ_API_KEY set instead — this project expects the var to be named GROK_API_KEY)'
        : ''

    const message = `Missing required environment variable(s): ${missing.join(', ')}${hint}`

    if (process.env.NODE_ENV === 'production') {
        console.error(message)
        process.exit(1)
    } else {
        console.warn(`${message} — continuing since NODE_ENV is not "production"`)
    }
}

module.exports = checkRequiredEnv
module.exports.REQUIRED_ENV_VARS = REQUIRED_ENV_VARS
