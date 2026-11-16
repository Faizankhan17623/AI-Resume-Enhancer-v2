import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { ReportApi } from '../Apis/ReportApi.js'

// bug report / feature suggestion modal sir, per 2026-11-16 audit — ReportModal.jsx used to
// call apiConnector directly. No operations file existed for this domain despite ReportApi.js
// (the URL constants) and a real backend route already existing. Plain async function, not a
// thunk — no slice exists for this, the modal's state is local.

export async function SubmitReport(type, title, description, token) {
    try {
        const response = await apiConnector(
            'POST',
            ReportApi.submit,
            { type, title, description },
            { Authorization: `Bearer ${token}` }
        )
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.message
    } catch (error) {
        logApiError('Error submitting report', error)
        throw error
    }
}
