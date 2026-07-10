import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { setUser, setLoading, setToken, setLogin, setSignupData } from '../../Slices/authSlice.js'
import { CreateUser, SendOtp, Login } from '../Apis/UserApi.js'

const { createuser } = CreateUser
const { createotp } = SendOtp
const { login } = Login

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
            console.error("Error sending the OTP", error)
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
            console.error("Error creating the user", error)
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

            const { token, user } = response.data

            dispatch(setToken(token))
            dispatch(setUser(user))
            dispatch(setLogin(true))

            localStorage.setItem("token", JSON.stringify(token))
            localStorage.setItem("user", JSON.stringify(user))

            toast.success(`Welcome back ${user?.firstName || ''}`)
            if (navigate) navigate("/Dashboard")
        } catch (error) {
            console.error("Error logging in", error)
            toast.error(error?.response?.data?.message || "Could not log you in")
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
