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
