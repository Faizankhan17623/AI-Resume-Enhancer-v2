import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

// only Admin and Support get in sir — the backend double-checks with isAdmin/isSupport anyway,
// this just keeps normal users from ever seeing the admin pages
function AdminRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token !== null && ['Admin', 'Support'].includes(user?.role)) {
        return children
    } else {
        return <Navigate to="/Dashboard" />
    }

}
export default AdminRoute
