import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setProfile, setLoading, setNotificationPrefs, setOnboardingCompleted, setProfileUserFields } from '../../Slices/profileSlice.js'
import { Profile, Password } from '../Apis/UserApi.js'

const {
    getprofile, updatenotifications, completeonboarding,
    updatefirstname, updatelastname, updateemail, updatenumber, exportdata
} = Profile
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
            logApiError("Error fetching the profile", error)
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
                notifyHealthCheck: response.data.notifyHealthCheck,
            }))
        } catch (error) {
            logApiError("Error updating notification preferences", error)
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
            logApiError("Error updating the password", error)
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
            logApiError("Error completing onboarding", error)
        }
    }
}

// one shared helper sir — every profile-field edit follows the same call → merge → toast pattern
const updateProfileField = (url, body, token, fieldForError) => {
    return async (dispatch) => {
        const toastId = toast.loading("Saving...")
        try {
            const response = await apiConnector("PATCH", url, body, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setProfileUserFields(body))
            toast.success(response.data.message || "Updated successfully")
            return true
        } catch (error) {
            logApiError(`Error updating ${fieldForError}`, error)
            toast.error(error?.response?.data?.message || `Could not update ${fieldForError}`)
            return false
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export const UpdateFirstName = (firstName, token) => updateProfileField(updatefirstname, { firstName }, token, "first name")
export const UpdateLastName = (lastName, token) => updateProfileField(updatelastname, { lastName }, token, "last name")
export const UpdateEmail = (email, token) => updateProfileField(updateemail, { email }, token, "email")
export const UpdateNumber = (number, token) => updateProfileField(updatenumber, { number }, token, "phone number")

// GDPR-style self-service data export sir — downloads the response as a JSON file client-side,
// no separate download endpoint needed since the data is small (one user's own records)
export function ExportMyData(token) {
    return async () => {
        const toastId = toast.loading("Preparing your data export...")
        try {
            const response = await apiConnector("GET", exportdata, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `resumify-data-export-${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)

            toast.success("Your data export has downloaded")
        } catch (error) {
            logApiError("Error exporting data", error)
            toast.error(error?.response?.data?.message || "Could not export your data")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
