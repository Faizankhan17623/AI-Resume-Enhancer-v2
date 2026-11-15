import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router'

// logged-out-only pages (Login/Signup/etc) sir — an already-logged-in user gets bounced
// straight to their OWN dashboard, same role split as everywhere else
function OpenRoute({ children }) {
    const { isLoggedIn, user } = useSelector((state) => state.auth)
    const location = useLocation()

    if (!isLoggedIn) {
        return children
    }

    // same `state.from` honored here sir, per 2026-11-15 audit — an ALREADY-logged-in User who
    // still landed on /Login (e.g. a stale tab, or clicking a job-apply link that bounced them
    // here before their session was recognized) should return to that job too, same as a fresh
    // login does in Services/operations/Auth.js's LoginUser
    const from = location.state?.from
    const landingPath = user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support'
        : user?.role === 'User' && from ? from : '/Dashboard'
    return <Navigate to={landingPath} />
}
export default OpenRoute
