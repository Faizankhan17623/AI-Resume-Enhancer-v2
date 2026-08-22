import { useSelector } from "react-redux"
import { Navigate, useLocation } from "react-router"

// User-only sir — strict isolation, same rule as AdminRoute/SupportRoute/RecruiterRoute. An
// Admin, Support, or Recruiter account can never use the product's own Dashboard pages (reviews,
// chat, builder, etc), only their own management dashboard. They're redirected to it here instead
// of being let through.
//
// Gated on isLoggedIn rather than the token sir: the token now lives only in memory (see
// Slices/authSlice.js) so it is null after any page reload, while the httpOnly session cookie
// is still perfectly valid. Checking the token here would have bounced every reloading user
// to /Login despite a live session. This guard is a UX redirect only — real enforcement is the
// backend's Auth middleware, which revalidates the session and re-reads the role on every call.
const SUSPENDED_PATH = '/Dashboard/Suspended'

function PrivateRoute({ children }) {
    const { isLoggedIn, user } = useSelector((state) => state.auth)
    const location = useLocation()

    if (!isLoggedIn) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Support') {
        return <Navigate to="/Support" />
    }
    if (user?.role === 'Recruiter') {
        return <Navigate to="/Recruiter" />
    }
    // a banned account can only ever see the Suspended page sir — every other Dashboard route
    // redirects here instead of mounting (its own data calls would just 403 anyway, see
    // Backend/Middlewares/Auth.js's ban check). isBanned comes from publicUser() at login and is
    // re-set the moment an admin bans/unbans, since login always re-runs it fresh.
    if (user?.isBanned && location.pathname !== SUSPENDED_PATH) {
        return <Navigate to={SUSPENDED_PATH} />
    }
    return children
}

export default PrivateRoute
