import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router'

const SUSPENDED_PATH = '/Support/Suspended'

// Support only sir — this is deliberately its OWN role check, not a relaxed AdminRoute.
// An Admin landing on a /Support/* URL gets sent to their real dashboard at /Admin instead
// of just being let through, so each role only ever lives on its own dashboard.
function SupportRoute({ children }) {
    const { isLoggedIn, user } = useSelector((state) => state.auth)
    const location = useLocation()

    if (!isLoggedIn) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Recruiter') {
        return <Navigate to="/Recruiter" />
    }
    if (user?.role !== 'Support') {
        return <Navigate to="/Dashboard" />
    }
    // a suspended Support account can only ever see the Suspended page sir — every other
    // /Support/* route redirects here instead of mounting (its own data calls would just 403
    // anyway, see Backend/Middlewares/Auth.js's ban check, which is role-agnostic). Was
    // previously missing entirely: a banned Support account passed every check above and
    // reached the normal dashboard UI, which then broke on its first API call instead of
    // showing a clear "you're suspended" state — PrivateRoute.jsx has had this same check for
    // regular Users since the suspension feature shipped, this was the gap.
    if (user?.isBanned && location.pathname !== SUSPENDED_PATH) {
        return <Navigate to={SUSPENDED_PATH} />
    }
    return children
}
export default SupportRoute
