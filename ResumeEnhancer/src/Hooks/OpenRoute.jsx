import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

// logged-out-only pages (Login/Signup/etc) sir — an already-logged-in user gets bounced
// straight to their OWN dashboard, same role split as everywhere else
function OpenRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token === null) {
        return children
    }

    const landingPath = user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support' : '/Dashboard'
    return <Navigate to={landingPath} />
}
export default OpenRoute
