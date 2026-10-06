import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setApplications, setLoading, setSaving, setAnalytics, setAnalyticsLoading, setDiagnosingId, setRejectionPattern, patchApplication } from '../../Slices/applicationSlice.js'
import { ApplicationData } from '../Apis/ApplicationApi.js'

const { create, all, update, remove, analytics, diagnose, rejectionPatterns } = ApplicationData

export function GetApplications(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", all, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setApplications(response.data.applications))
        } catch (error) {
            logApiError("Error fetching your applications", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function CreateApplication(payload, token) {
    return async (dispatch) => {
        dispatch(setSaving(true))
        try {
            const response = await apiConnector("POST", create, payload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Application added")
            dispatch(GetApplications(token))
            return true
        } catch (error) {
            logApiError("Error adding the application", error)
            toast.error(error?.response?.data?.message || "Could not add the application")
            return false
        } finally {
            dispatch(setSaving(false))
        }
    }
}

// used for both the edit modal AND drag-and-drop status moves sir — same endpoint, different payload shape
export function UpdateApplication(applicationId, payload, token, { silent = false } = {}) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${update}/${applicationId}`, payload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            if (!silent) toast.success("Application updated")
            dispatch(GetApplications(token))
            return true
        } catch (error) {
            logApiError("Error updating the application", error)
            toast.error(error?.response?.data?.message || "Could not update the application")
            // a silent (drag-and-drop) failure still needs the board re-synced to the real state sir
            if (silent) dispatch(GetApplications(token))
            return false
        }
    }
}

// score bucket -> interview rate sir, Pro Max only (backend 403s everyone else)
export function GetApplicationAnalytics(token) {
    return async (dispatch) => {
        dispatch(setAnalyticsLoading(true))
        try {
            const response = await apiConnector("GET", analytics, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAnalytics(response.data))
        } catch (error) {
            logApiError("Error fetching application analytics", error)
        } finally {
            dispatch(setAnalyticsLoading(false))
        }
    }
}

export function DeleteApplication(applicationId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${remove}/${applicationId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Application removed")
            dispatch(GetApplications(token))
        } catch (error) {
            logApiError("Error deleting the application", error)
            toast.error(error?.response?.data?.message || "Could not remove the application")
        }
    }
}

// opt-in AI rejection diagnosis sir — spends one of the user's own AI credits, same pool a
// fresh review spends from. Only call this for a card that's Rejected AND has a review linked;
// the backend 400s otherwise with a message explaining why.
export function DiagnoseRejection(applicationId, token) {
    return async (dispatch) => {
        dispatch(setDiagnosingId(applicationId))
        try {
            const response = await apiConnector("POST", `${diagnose}/${applicationId}/diagnose`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(patchApplication(response.data.application))
            toast.success("Diagnosis ready")
        } catch (error) {
            logApiError("Error running the rejection diagnosis", error)
            toast.error(error?.response?.data?.message || "Could not run the diagnosis")
        } finally {
            dispatch(setDiagnosingId(null))
        }
    }
}

// pure aggregation sir, NO AI call, no credit spent — safe to call on every board load
export function GetRejectionPatterns(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", rejectionPatterns, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setRejectionPattern(response.data))
        } catch (error) {
            logApiError("Error checking your rejection patterns", error)
        }
    }
}
