import { useSelector } from 'react-redux'
import { Navigate } from 'react-router'

// Recruiter only sir — strict isolation, same rule as AdminRoute/SupportRoute. A candidate
// (plain 'User') hitting a /Recruiter/* URL gets sent to their own Dashboard instead of being
// let through. The backend re-checks with isRecruiter on every call regardless.
function RecruiterRoute({ children }) {
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
    if (user?.role !== 'Recruiter') {
        return <Navigate to="/Dashboard" />
    }
    return children
}
export default RecruiterRoute
