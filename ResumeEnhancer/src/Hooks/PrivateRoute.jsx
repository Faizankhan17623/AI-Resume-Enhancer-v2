import { useSelector } from "react-redux"
import { Navigate } from "react-router"

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
function PrivateRoute({ children }) {
    const { isLoggedIn, user } = useSelector((state) => state.auth)

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
    return children
}

export default PrivateRoute
