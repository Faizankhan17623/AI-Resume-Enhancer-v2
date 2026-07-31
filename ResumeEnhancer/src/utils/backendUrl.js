// single source of truth for the API base URL sir — every Services/Apis/*.js file previously
// read import.meta.env.VITE_MAIN_BACKEND_URL directly with no fallback, so an unset var (new
// preview branch, Vercel env misconfig) silently turned every request into "undefined/...".
// Failing loudly in dev/build and falling back to localhost only in local dev makes the gap visible.
const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

if (!BASE_URL && import.meta.env.DEV) {
    console.error('VITE_MAIN_BACKEND_URL is not set — API calls will fail. Check your .env file.')
}

export default BASE_URL || (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '')
