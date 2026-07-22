import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setUser, setLoading, setToken, setLogin, setSignupData } from '../../Slices/authSlice.js'
import { CreateUser, SendOtp, Login, Password, Account } from '../Apis/UserApi.js'

const { createuser } = CreateUser
const { createotp } = SendOtp
const { login } = Login
const { forgotpassword, resetpassword } = Password
const { deleteaccount } = Account

// step 1 of the signup sir — fire the OTP mail and move to the OTP screen
export function SendTheOtp(email, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Sending the OTP...")
        try {
            const response = await apiConnector("POST", createotp, { email })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("OTP sent to your email")
            if (navigate) navigate("/Verify-Otp")
        } catch (error) {
            logApiError("Error sending the OTP", error)
            toast.error(error?.response?.data?.message || "Could not send the OTP")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// step 2 sir — the full account creation with the OTP the user typed
export function CreateTheUser(signupData, otp, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Creating your account...")
        try {
            const response = await apiConnector("POST", createuser, {
                ...signupData,
                otp
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Account created, please log in")
            dispatch(setSignupData(null))
            if (navigate) navigate("/Login")
        } catch (error) {
            logApiError("Error creating the user", error)
            toast.error(error?.response?.data?.message || "Could not create the account")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function LoginUser(email, password, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Logging you in...")
        try {
            const response = await apiConnector("POST", login, { email, password })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            const { token, user, accountRecovered } = response.data

            dispatch(setToken(token))
            dispatch(setUser(user))
            dispatch(setLogin(true))

            localStorage.setItem("token", JSON.stringify(token))
            localStorage.setItem("user", JSON.stringify(user))

            // longer + distinct toast sir — this is a meaningfully different event from a normal
            // login and the user should notice their deletion got undone
            if (accountRecovered) {
                toast.success("Your account was recovered — the scheduled deletion has been cancelled", { duration: 6000 })
            } else {
                toast.success(`Welcome back ${user?.firstName || ''}`)
            }
            if (navigate) navigate("/Dashboard")
        } catch (error) {
            logApiError("Error logging in", error)
            toast.error(error?.response?.data?.message || "Could not log you in")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
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
    return (dispatch) => {
        dispatch(setToken(null))
        dispatch(setUser(null))
        dispatch(setLogin(false))
        localStorage.removeItem("token")
        localStorage.removeItem("user")
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
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            if (navigate) navigate("/")
        } catch (error) {
            logApiError("Error deleting the account", error)
            toast.error(error?.response?.data?.message || "Could not delete the account")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
