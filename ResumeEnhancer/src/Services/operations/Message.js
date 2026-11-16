import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { MessageApi } from '../Apis/MessageApi.js'

// recruiter<->candidate job-application message thread sir, per 2026-11-16 audit —
// MessageThreadModal.jsx used to call apiConnector directly. No operations file existed for
// this domain despite MessageApi.js (the URL constants) and a real backend route already
// existing. Plain async functions, not thunks — no slice exists, the modal's state is local.

export async function GetMessageThread(applicationId, token) {
    try {
        const response = await apiConnector('GET', `${MessageApi.thread}/${applicationId}/messages`, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.thread
    } catch (error) {
        logApiError("Error loading the message thread", error)
        return null
    }
}

export async function SendThreadMessage(applicationId, text, token) {
    try {
        const response = await apiConnector('POST', `${MessageApi.thread}/${applicationId}/messages`, { text }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.thread
    } catch (error) {
        logApiError("Error sending the message", error)
        throw error
    }
}
