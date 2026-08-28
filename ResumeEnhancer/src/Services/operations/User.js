import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setProfile, setLoading, setNotificationPrefs, setOnboardingCompleted, setProfileUserFields } from '../../Slices/profileSlice.js'
import { setUser } from '../../Slices/authSlice.js'
import { Profile, Password, RecruiterApplication, SuspensionAppeal, Referral, CreditHistory as creditHistoryUrl } from '../Apis/UserApi.js'

const {
    getprofile, updatenotifications, completeonboarding,
    updatefirstname, updatelastname, updateemail, updatenumber, exportdata
} = Profile
const { changepassword } = Password
const { apply: applyForRecruiterUrl } = RecruiterApplication
const { submit: appealSuspensionUrl } = SuspensionAppeal
const { stats: referralStatsUrl, history: referralHistoryUrl } = Referral

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

            // Re-seat the cached auth user from the SERVER's answer sir.
            //
            // localStorage's copy of `user` is written at login and then only ever mutated
            // locally (Payment.js patched SubType into it after a purchase). Nothing refreshed
            // it from the server, so it drifted: a subscription that expired, was changed by an
            // admin, or was bought in another tab left the navbar badge and every `user.SubType`
            // read showing a plan the user no longer had.
            //
            // The backend returns the EFFECTIVE plan here (see Backend/utils/session.js and the
            // reconcile job), so this is the authoritative value. Merging rather than replacing
            // keeps any auth-only fields that /profile doesn't return.
            if (response.data.user) {
                dispatch(setUser(response.data.user))
            }
        } catch (error) {
            logApiError("Error fetching the profile", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// flips one notification preference sir — { notifyStreak } or { notifyWinBack } or { notifyDigest }.
// `onLoadingChange` shows the real centered spinner while the toggle's PATCH is in flight.
export function UpdateNotificationPrefs(prefs, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
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
                notifyInterviewPrep: response.data.notifyInterviewPrep,
            }))
        } catch (error) {
            logApiError("Error updating notification preferences", error)
            toast.error(error?.response?.data?.message || "Could not update notification preferences")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// changes the password from the account page sir — needs the old one, same as every professional
// app. `onLoadingChange` shows the real centered spinner (Components/extra/Loading.jsx) instead
// of the old toast.loading, same pattern as CreateAnnouncement/UpdateSetting in Services/
// operations/Admin.js — success/error still toast.
export function ChangePassword(oldPassword, newPassword, confirmNewPassword, token, onSuccess, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
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
            onLoadingChange?.(false)
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

// one shared helper sir — every profile-field edit follows the same call → merge → toast
// pattern. `onLoadingChange` shows the real centered spinner instead of a toast.loading, same
// as ChangePassword above.
const updateProfileField = (url, body, token, fieldForError, onLoadingChange) => {
    return async (dispatch) => {
        onLoadingChange?.(true)
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
            onLoadingChange?.(false)
        }
    }
}

export const UpdateFirstName = (firstName, token, onLoadingChange) => updateProfileField(updatefirstname, { firstName }, token, "first name", onLoadingChange)
export const UpdateLastName = (lastName, token, onLoadingChange) => updateProfileField(updatelastname, { lastName }, token, "last name", onLoadingChange)
export const UpdateEmail = (email, token, onLoadingChange) => updateProfileField(updateemail, { email }, token, "email", onLoadingChange)
export const UpdateNumber = (number, token, onLoadingChange) => updateProfileField(updatenumber, { number }, token, "phone number", onLoadingChange)

// self-signup request to become a Recruiter sir — role stays 'User' until an Admin approves
// it (see Admin/RecruiterApplications.jsx). Reuses the same profile-merge action as the other
// account-field edits, since recruiterApplication is just another field on the profile's user.
export function ApplyForRecruiter(payload, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", applyForRecruiterUrl, payload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setProfileUserFields({ recruiterApplication: response.data.recruiterApplication }))
            toast.success(response.data.message)
            return true
        } catch (error) {
            logApiError("Error submitting recruiter application", error)
            toast.error(error?.response?.data?.message || "Could not submit your application")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// the one thing a banned account can still do sir — everything else is 403'd by the backend's
// Auth middleware, this one route is explicitly exempt (see Backend/Middlewares/Auth.js).
// Merges suspensionAppealStatus into the cached auth user directly, same object shape
// publicUser() sends at login, so DashboardLayout's sidebar lock picks the change up at once
// with no extra /profile round-trip (which a banned user couldn't reach anyway).
export function SubmitSuspensionAppeal(message, token, onLoadingChange) {
    return async (dispatch, getState) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", appealSuspensionUrl, { message }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            const currentUser = getState().auth.user
            dispatch(setUser({ ...currentUser, suspensionAppealStatus: response.data.suspensionAppeal?.status }))
            toast.success(response.data.message)
            return true
        } catch (error) {
            logApiError("Error submitting suspension appeal", error)
            toast.error(error?.response?.data?.message || "Could not submit your appeal")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// GDPR-style self-service data export sir — downloads the response as a JSON file client-side,
// no separate download endpoint needed since the data is small (one user's own records).
// `onLoadingChange` shows the real centered spinner instead of a toast.loading.
export function ExportMyData(token, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
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
            onLoadingChange?.(false)
        }
    }
}

// the Account page's "Invite friends" card sir — no dedicated slice, just returns the data since
// it's a small, occasionally-viewed panel rather than something the rest of the app reads
export function GetReferralStats(token) {
    return async () => {
        try {
            const response = await apiConnector("GET", referralStatsUrl, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data
        } catch (error) {
            logApiError("Error fetching referral stats", error)
            return null
        }
    }
}

// the Account page's referral dashboard sir — full invite list + week/month/year/custom totals.
// customFrom/customTo are optional ISO date strings (yyyy-mm-dd from a <input type="date">).
export function GetReferralHistory(token, customFrom, customTo) {
    return async () => {
        try {
            const params = new URLSearchParams()
            if (customFrom) params.set('from', customFrom)
            if (customTo) params.set('to', customTo)
            const url = params.toString() ? `${referralHistoryUrl}?${params}` : referralHistoryUrl

            const response = await apiConnector("GET", url, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data
        } catch (error) {
            logApiError("Error fetching referral history", error)
            return null
        }
    }
}

// the Account page's "who gave me bonus credits" panel sir — merges Admin/Support grants with
// the user's own referral-signup bonus, see Backend/controllers/user.js's getCreditHistory
export function GetCreditHistory(token) {
    return async () => {
        try {
            const response = await apiConnector("GET", creditHistoryUrl, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data
        } catch (error) {
            logApiError("Error fetching credit history", error)
            return null
        }
    }
}
