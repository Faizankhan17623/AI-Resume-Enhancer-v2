import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// User-only sir — strict isolation, same rule as AdminRoute/SupportRoute. An Admin or
// Support account can never use the product's own Dashboard pages (reviews, chat, builder,
// etc), only their own management dashboard. They're redirected to it here instead of
// being let through.
function PrivateRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token === null) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Support') {
        return <Navigate to="/Support" />
    }
    return children
}

export default PrivateRoute
