import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

// only Admin and Support get in sir — the backend double-checks with isAdmin/isSupport anyway,
// this just keeps normal users from ever seeing the admin pages.
// adminOnly further restricts to Admin alone, for the two pages (Audit, Settings) whose
// backend routes are isAdmin-gated — without this a Support user could still type/bookmark
// the URL directly even though AdminNav already hides the tab for them
function AdminRoute({ children, adminOnly = false }) {
    const { token, user } = useSelector((state) => state.auth)

    const allowedRoles = adminOnly ? ['Admin'] : ['Admin', 'Support']

    if (token !== null && allowedRoles.includes(user?.role)) {
        return children
    } else {
        return <Navigate to="/Dashboard" />
    }

}
export default AdminRoute
