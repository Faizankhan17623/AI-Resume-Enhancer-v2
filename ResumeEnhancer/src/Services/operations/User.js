import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { setProfile, setLoading, setNotificationPrefs, setOnboardingCompleted } from '../../Slices/profileSlice.js'
import { Profile, Password } from '../Apis/UserApi.js'

const { getprofile, updatenotifications, completeonboarding } = Profile
const { changepassword } = Password

// the account page loads everything from this one call sir
export function GetProfile(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", getprofile, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setProfile(response.data))
        } catch (error) {
            console.error("Error fetching the profile", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// flips one notification preference sir — { notifyStreak } or { notifyWinBack } or { notifyDigest }
export function UpdateNotificationPrefs(prefs, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", updatenotifications, prefs, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setNotificationPrefs({
                notifyStreak: response.data.notifyStreak,
                notifyWinBack: response.data.notifyWinBack,
                notifyDigest: response.data.notifyDigest,
            }))
        } catch (error) {
            console.error("Error updating notification preferences", error)
            toast.error(error?.response?.data?.message || "Could not update notification preferences")
        }
    }
}

// changes the password from the account page sir — needs the old one, same as every professional app
export function ChangePassword(oldPassword, newPassword, confirmNewPassword, token, onSuccess) {
    return async () => {
        const toastId = toast.loading("Updating your password...")
        try {
            const response = await apiConnector("PUT", changepassword, {
                oldPassword, newPassword, confirmNewPassword
            }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Password updated successfully")
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error updating the password", error)
            toast.error(error?.response?.data?.message || "Could not update the password")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// dismisses the dashboard onboarding checklist for good sir — silent, no toast, it's a background action
export function CompleteOnboarding(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", completeonboarding, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setOnboardingCompleted(response.data.onboardingCompleted))
        } catch (error) {
            console.error("Error completing onboarding", error)
        }
    }
}
