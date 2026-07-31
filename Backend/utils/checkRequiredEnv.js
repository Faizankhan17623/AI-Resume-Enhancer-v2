// same list AdminSystem.js's health dashboard already checks sir — that endpoint made a
// missing var *visible*, this makes it *fatal* at boot in production instead of letting the
// server come up "healthy" and then throw on the first login/AI/DB call that needs it
const REQUIRED_ENV_VARS = ['MONGO_DB_URL', 'GROK_API_KEY', 'JWT_PRIVATE_KEY']

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
