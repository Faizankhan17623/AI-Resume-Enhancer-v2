import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

// Support only sir — this is deliberately its OWN role check, not a relaxed AdminRoute.
// An Admin landing on a /Support/* URL gets sent to their real dashboard at /Admin instead
// of just being let through, so each role only ever lives on its own dashboard.
function SupportRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token === null) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role !== 'Support') {
        return <Navigate to="/Dashboard" />
    }
    return children
}
export default SupportRoute
