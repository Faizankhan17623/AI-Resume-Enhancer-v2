import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { InterviewApi } from '../Apis/InterviewApi.js'

// Interview scheduling sir, per 2026-11-16 audit — MyInterviews.jsx, InterviewFeedbackModal.jsx,
// and ScheduleInterviewModal.jsx all used to call apiConnector directly. No operations file
// existed for this domain at all despite InterviewApi.js (the URL constants) and real backend
// routes already existing — that gap is exactly why those three components reached for
// apiConnector themselves instead. No slice exists because each caller's state is local
// (useState), same shape as Career.js's own plain async functions — not thunks that dispatch.

export async function GetMyInterviews(token) {
    try {
        const response = await apiConnector('GET', InterviewApi.myInterviews, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.schedules
    } catch (error) {
        logApiError("Error fetching your interviews", error)
        return null
    }
}

export async function ConfirmInterviewSlot(scheduleId, slotIndex, token) {
    try {
        const response = await apiConnector('POST', `${InterviewApi.confirmSlot}/${scheduleId}/confirm`, { slotIndex }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        toast.success('Interview confirmed — check your email for the calendar invite')
        return true
    } catch (error) {
        logApiError("Error confirming the interview slot", error)
        toast.error(error?.response?.data?.message || error.message || 'Could not confirm this slot')
        return false
    }
}

export async function CancelInterview(scheduleId, token) {
    try {
        const response = await apiConnector('PATCH', `${InterviewApi.cancelInterview}/${scheduleId}/cancel`, {}, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        toast.success('Interview cancelled')
        return true
    } catch (error) {
        logApiError("Error cancelling the interview", error)
        toast.error(error?.response?.data?.message || error.message || 'Could not cancel this interview')
        return false
    }
}

// returns { schedule, failed } sir, per 2026-11-27 audit — `schedule` is genuinely null/undefined
// both when the request fails AND when no interview exists yet for this application; `failed`
// lets the caller tell those two cases apart instead of showing "no interview scheduled" for a
// request that actually errored
export async function GetInterviewForApplication(applicationId, token) {
    try {
        const response = await apiConnector('GET', `${InterviewApi.getInterviewForApplication}/${applicationId}/interview`, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return { schedule: response.data.schedule, failed: false }
    } catch (error) {
        logApiError("Error loading this interview", error)
        toast.error(error?.response?.data?.message || error.message || 'Could not load this interview')
        return { schedule: null, failed: true }
    }
}

export async function SubmitInterviewFeedback(scheduleId, feedback, token) {
    try {
        const response = await apiConnector('POST', `${InterviewApi.submitFeedback}/${scheduleId}/feedback`, feedback, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        toast.success('Feedback saved')
        return true
    } catch (error) {
        logApiError("Error saving interview feedback", error)
        toast.error(error?.response?.data?.message || error.message || 'Could not save feedback')
        return false
    }
}

export async function ScheduleInterview(applicationId, payload, token) {
    try {
        const response = await apiConnector('POST', `${InterviewApi.scheduleInterview}/${applicationId}/schedule-interview`, payload, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        toast.success('Interview slots sent to the candidate')
        return true
    } catch (error) {
        logApiError("Error scheduling the interview", error)
        toast.error(error?.response?.data?.message || error.message || 'Could not propose interview slots')
        return false
    }
}
