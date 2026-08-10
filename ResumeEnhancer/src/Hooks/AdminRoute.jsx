import { useSelector } from 'react-redux'
import { Navigate } from 'react-router'

// Admin only sir — strictly. Every role is locked to its own dashboard: a Support user
// hitting an /Admin/* URL gets sent to their real dashboard at /Support, not let through
// with some buttons hidden. The backend re-checks with isAdmin on every call regardless.
function AdminRoute({ children }) {
    const { isLoggedIn, user } = useSelector((state) => state.auth)

    if (!isLoggedIn) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Support') {
        return <Navigate to="/Support" />
    }
    if (user?.role === 'Recruiter') {
        return <Navigate to="/Recruiter" />
    }
    if (user?.role !== 'Admin') {
        return <Navigate to="/Dashboard" />
    }
    return children
}
export default AdminRoute
