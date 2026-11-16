import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { JobAlertApi } from '../Apis/JobAlertApi.js'

// candidate's saved-search job alerts sir, per 2026-11-16 audit — JobAlerts.jsx and
// JobBoard.jsx both used to call apiConnector directly. No operations file existed for this
// domain despite JobAlertApi.js (the URL constants) and real backend routes already existing.
// Plain async functions, not thunks — no slice exists for this, both callers keep local state.

export async function GetJobAlerts(token) {
    try {
        const response = await apiConnector('GET', JobAlertApi.list, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.alerts
    } catch (error) {
        logApiError("Error fetching your job alerts", error)
        return null
    }
}

export async function SaveJobAlert(payload, token) {
    try {
        const response = await apiConnector('POST', JobAlertApi.create, payload, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        toast.success("Saved — we'll email you when a matching job is posted")
        return true
    } catch (error) {
        logApiError("Error saving the job alert", error)
        toast.error(error?.response?.data?.message || error.message || 'Could not save this alert')
        return false
    }
}

export async function ToggleJobAlert(alertId, active, token) {
    try {
        const response = await apiConnector('PATCH', `${JobAlertApi.update}/${alertId}`, { active }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return true
    } catch (error) {
        logApiError("Error updating the job alert", error)
        toast.error(error?.response?.data?.message || 'Could not update this alert')
        return false
    }
}

export async function DeleteJobAlert(alertId, token) {
    try {
        const response = await apiConnector('DELETE', `${JobAlertApi.remove}/${alertId}`, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        toast.success('Alert removed')
        return true
    } catch (error) {
        logApiError("Error removing the job alert", error)
        toast.error(error?.response?.data?.message || 'Could not remove this alert')
        return false
    }
}
