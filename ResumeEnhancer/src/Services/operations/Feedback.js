import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { FeedbackApi } from '../Apis/FeedbackApi.js'

// in-app feedback popup sir, per 2026-11-16 audit — FeedbackModal.jsx used to call apiConnector
// directly. No operations file existed for this domain despite FeedbackApi.js (the URL
// constants) and real backend routes already existing. Plain async functions, not thunks — no
// slice exists for this, the modal's state is local.

export async function GetFeedbackStatus(token) {
    try {
        const response = await apiConnector('GET', FeedbackApi.status, null, {
            Authorization: `Bearer ${token}`,
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.shouldShow
    } catch (error) {
        // silent sir, same as the caller's own prior behavior — a missed popup check should
        // never disturb the dashboard
        logApiError('Error checking feedback status', error)
        return false
    }
}

export async function SubmitFeedback(rating, referralScore, reviewText, token) {
    try {
        const response = await apiConnector(
            'POST',
            FeedbackApi.submit,
            { rating, referralScore, reviewText },
            { Authorization: `Bearer ${token}` }
        )
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return true
    } catch (error) {
        logApiError('Error submitting feedback', error)
        throw error
    }
}
