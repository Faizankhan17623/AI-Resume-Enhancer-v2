import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setUser, setLoading, setToken, setLogin, setSignupData } from '../../Slices/authSlice.js'
import { CreateUser, SendOtp, Login, Logout, Password, Account } from '../Apis/UserApi.js'

const { createuser } = CreateUser
const { createotp } = SendOtp
const { login } = Login
const { logout } = Logout
const { forgotpassword, resetpassword } = Password
const { deleteaccount } = Account

// step 1 of the signup sir — fire the OTP mail and move to the OTP screen. `onStatus` follows
// the same pattern as LoginUser below: ('loading'|'success'|'error', message) instead of a
// toast, so Join.jsx can drive the same full-screen LoginStatusOverlay used for login.
export function SendTheOtp(email, navigate, onStatus) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        onStatus?.('loading', 'Sending the OTP...')
        try {
            const response = await apiConnector("POST", createotp, { email })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            onStatus?.('success', 'OTP sent to your email')
            // brief pause sir — same as LoginUser, long enough for the checkmark to register
            setTimeout(() => { if (navigate) navigate("/Verify-Otp") }, 900)
        } catch (error) {
            logApiError("Error sending the OTP", error)
            onStatus?.('error', error?.response?.data?.message || "Could not send the OTP")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// step 2 sir — the full account creation with the OTP the user typed. Same onStatus pattern.
export function CreateTheUser(signupData, otp, navigate, onStatus) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        onStatus?.('loading', 'Verifying...')
        try {
            const response = await apiConnector("POST", createuser, {
                ...signupData,
                otp
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            onStatus?.('success', 'Account created — redirecting to log in')
            // navigate BEFORE clearing signupData sir — OTP.jsx's own guard
            // (`if (!signupData) return <Navigate to="/Signup" />`) re-renders the instant
            // signupData goes null and was winning this race, bouncing the user back to
            // /Signup right after a successful signup instead of landing on /Login. Clearing
            // it after the navigate call means that guard never gets a chance to fire on this
            // page again — the user's already been routed away.
            setTimeout(() => {
                if (navigate) navigate("/Login")
                dispatch(setSignupData(null))
            }, 900)
        } catch (error) {
            logApiError("Error creating the user", error)
            onStatus?.('error', error?.response?.data?.message || "Could not create the account")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// `onStatus` sir — replaces the old toast.loading/success/error trio. Called with
// ('loading'|'success'|'error', message) so the caller (Login/User.jsx's LoginStatusOverlay) can
// drive one centered status panel instead of a toast, matching the same status-overlay pattern
// OAuthComplete.jsx uses for the OAuth login path. navigate is still called on success, but only
// AFTER a short pause so the success checkmark is actually visible before the redirect fires.
export function LoginUser(email, password, navigate, onStatus) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        onStatus?.('loading', 'Logging in...')
        try {
            const response = await apiConnector("POST", login, { email, password })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            const { token, user, accountRecovered } = response.data

            dispatch(setToken(token))
            dispatch(setUser(user))
            dispatch(setLogin(true))

            // the token is NOT persisted sir — it stays in redux (memory) only, because the
            // httpOnly session cookie set by this same response is the real credential and a
            // localStorage copy would hand it to any XSS. Only the non-sensitive user object is
            // cached, purely so a reload can paint the dashboard without a flash - and that cache is
            // written by the setUser reducer itself (Slices/authSlice.js), so redux and
            // localStorage cannot drift apart.

            // distinct message sir — this is a meaningfully different event from a normal login
            // and the user should notice their deletion got undone
            const successMessage = accountRecovered
                ? "Account recovered — the scheduled deletion has been cancelled"
                : "Login successful"
            onStatus?.('success', successMessage)

            // each role lands on its OWN dashboard sir — never a shared landing page
            const landingPath = user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support' : '/Dashboard'
            // brief pause sir — long enough for the checkmark to register before the page changes
            // out from under it, short enough that login still feels instant
            setTimeout(() => { if (navigate) navigate(landingPath) }, 900)
        } catch (error) {
            logApiError("Error logging in", error)
            onStatus?.('error', error?.response?.data?.message || "Login failed")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// step 1 sir — send the reset link to the user's email
export function ForgotPassword(email, setEmailSent) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Sending the reset link...")
        try {
            const response = await apiConnector("POST", forgotpassword, { email })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Reset link sent, please check your email")
            if (setEmailSent) setEmailSent(true)
        } catch (error) {
            logApiError("Error sending the reset link", error)
            toast.error(error?.response?.data?.message || "Could not send the reset link")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// step 2 sir — set the new password using the token from the emailed link
export function ResetPassword(token, newPassword, confirmNewPassword, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Resetting your password...")
        try {
            const response = await apiConnector("POST", resetpassword, {
                token, newPassword, confirmNewPassword
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Password reset, please log in")
            if (navigate) navigate("/Login")
        } catch (error) {
            logApiError("Error resetting the password", error)
            toast.error(error?.response?.data?.message || "Could not reset the password")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function LogoutUser(navigate) {
    return async (dispatch) => {
        // tell the SERVER to end the session sir. Clearing local state alone used to leave the
        // token valid for its full remaining 7 days, so anyone holding a copy stayed logged in
        // after the user thought they'd signed out. This bumps tokenVersion server-side, which
        // invalidates it everywhere, and clears the httpOnly cookie the browser can't touch.
        try {
            await apiConnector("POST", logout)
        } catch (error) {
            // never trap the user in a logged-in UI because the call failed sir — clear locally
            // regardless. The session cookie expires on its own and a 401 will clean up the rest.
            logApiError("Error logging out", error)
        }

        dispatch(setToken(null))
        dispatch(setUser(null))
        dispatch(setLogin(false))
        toast.success("Logged out")
        if (navigate) navigate("/")
    }
}

// suspends the account (2-day recovery window, undone automatically by logging back in) sir,
// then logs the user out locally since their session is no longer usable — Auth middleware
// blocks any Buffer:true account on the very next request anyway
export function DeleteAccount(token, navigate) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting your account...")
        try {
            const response = await apiConnector("DELETE", deleteaccount, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Account scheduled for deletion — check your email for details")
            dispatch(setToken(null))
            dispatch(setUser(null))
            dispatch(setLogin(false))
            if (navigate) navigate("/")
        } catch (error) {
            logApiError("Error deleting the account", error)
            toast.error(error?.response?.data?.message || "Could not delete the account")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
