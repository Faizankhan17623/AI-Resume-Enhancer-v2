import axios from "axios";
import toast from "react-hot-toast";

// withCredentials so the httpOnly cookies flow sir — the login token and the payment session need it
export const axiosinstance = axios.create({
    withCredentials: true
})

// session-expiry handling sir — this file has no access to the Redux store or useNavigate
// (it's outside any component), so a 401 here clears the SAME localStorage keys LogoutUser
// uses in Services/operations/Auth.js and does a hard redirect via window.location.href.
// A hard redirect (not react-router navigate) also guarantees Redux state gets wiped clean
// on the next load, since there's no store dispatch reachable from an axios interceptor.
//
// This is also what handles a REVOKED session sir — the backend now returns 401 when a token's
// version no longer matches the account (logout elsewhere, password change, password reset), so
// a tab left open on a revoked session gets cleaned up the moment it makes any call.
//
// Two endpoints return a 401 for a reason that has NOTHING to do with session revocation —
// /Login on a wrong password, /change-password on a wrong OLD password — and both already show
// their own toast.error in Services/operations/Auth.js's catch block. Routing those through this
// handler too would show a confusing second "Session expired" toast on a login SCREEN, and
// worse, used to permanently latch sessionExpiredHandled (see below) so a REAL revocation later
// in the same tab was then silently ignored for the rest of the tab's life.
const SESSION_CHECK_EXEMPT_PATHS = ['/Login', '/change-password']
const isSessionCheckExempt = (url) =>
    SESSION_CHECK_EXEMPT_PATHS.some((path) => url?.includes(path))

// dedupes a burst of CONCURRENT requests that all 401 at once (e.g. several dashboard widgets
// firing on mount) into a single toast/redirect sir — NOT a permanent one-shot lock. It is reset
// the moment the redirect actually fires, so it can never suppress a later, genuine revocation.
let sessionExpiredHandled = false

// catches a ban that lands WHILE the account is already logged in and sitting on a page sir —
// Backend/Middlewares/Auth.js returns 403 { banned: true, permanent, ... } on every request once
// isBanned is set, but the frontend's route guards (PrivateRoute/SupportRoute) only read the
// Redux-cached user, which nothing re-fetches mid-session. Without this, a Support/User account
// that was already logged in stayed on their current page — looking fine — until they happened
// to navigate somewhere that re-ran the guard. This reacts to the ban on the very next API call
// instead, same dedupe shape as the 401 handler above so a burst of concurrent 403s only redirects
// once. A hard redirect (not react-router navigate) since this file has no store/navigate access,
// same as the 401 path — note GetProfile itself is NOT reachable once banned (Auth.js blocks
// /profile too, it isn't on BAN_CHECK_EXEMPT_PATHS), so the ban details are merged into the
// cached user straight from THIS 403's body below before reloading.
let banHandled = false
axiosinstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const isUnauthorized = error?.response?.status === 401
        const isExempt = isSessionCheckExempt(error?.config?.url)

        if (isUnauthorized && !isExempt && !sessionExpiredHandled) {
            sessionExpiredHandled = true
            localStorage.removeItem("user")
            toast.error("Session expired, please log in again")
            if (window.location.pathname !== '/Login') {
                window.location.href = '/Login'
            } else {
                // already on /Login sir — there is no navigation to dedupe against, so release
                // the latch immediately instead of leaving it stuck for the rest of the tab's life
                sessionExpiredHandled = false
            }
        }

        const isBanned = error?.response?.status === 403 && error?.response?.data?.banned
        if (isBanned && !banHandled) {
            // same split as PrivateRoute/SupportRoute sir — whichever area they were in when the
            // ban landed is where their Suspended page lives
            const suspendedPath = window.location.pathname.startsWith('/Support')
                ? '/Support/Suspended'
                : '/Dashboard/Suspended'
            if (window.location.pathname !== suspendedPath) {
                banHandled = true

                // merge the ban details straight into the cached user BEFORE the reload sir — the
                // hard redirect below reboots the whole app, and Suspended.jsx/SupportSuspended.jsx
                // read banReason/permanentSuspensionReason/suspensionAppealStatus straight off the
                // Redux-cached user (authSlice.js's cachedUser(), synced from this same localStorage
                // key). Without this they'd land on a "No reason was provided" screen until the
                // account's NEXT real login re-ran publicUser(). Auth.js's 403 body carries these
                // same field names on purpose so this is a straight merge, no reshaping.
                try {
                    const cached = JSON.parse(localStorage.getItem('user') || 'null')
                    if (cached) {
                        const { permanent, banReason, permanentSuspensionReason, suspensionAppealStatus } = error.response.data
                        localStorage.setItem('user', JSON.stringify({
                            ...cached,
                            isBanned: true,
                            permanentlySuspended: permanent || undefined,
                            banReason,
                            permanentSuspensionReason,
                            suspensionAppealStatus,
                        }))
                    }
                } catch {
                    // corrupt cache sir — not worth blocking the redirect over, Suspended.jsx just
                    // falls back to its "No reason was provided" copy same as any other cache miss
                }

                window.location.href = suspendedPath
            }
        }

        return Promise.reject(error)
    }
)

export const apiConnector = (method, url, bodyData = null , headers ={}, params)=>{
    return axiosinstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null
    });
}
