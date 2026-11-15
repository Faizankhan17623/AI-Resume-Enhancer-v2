import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { CareerApi } from '../Apis/CareerApi.js'

// Career Copilot sir, per 2026-11-15 audit — this used to call apiConnector directly inside
// CareerCopilot.jsx, the one component in the app that did. Every other feature keeps its
// apiConnector calls in an operations file like this one; CareerCopilot.jsx keeps its own state
// locally (no careerSlice — nothing here is needed outside this one page) rather than in Redux,
// so these are plain async functions that return data/null instead of thunks that dispatch, same
// shape as this file's sibling Review.js's own DownloadReviewPdf.

export async function GetCareerOverview(token) {
    try {
        const response = await apiConnector("GET", CareerApi.overview, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data
    } catch (error) {
        logApiError("Error fetching the career overview", error)
        return null
    }
}

export async function AnalyzeApplicationCopilot(jobText, token) {
    try {
        const response = await apiConnector("POST", CareerApi.applicationCopilot, { jobText }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data
    } catch (error) {
        logApiError("Error analyzing the application", error)
        toast.error("Could not analyze this application, please try again.")
        return null
    }
}

export async function BuildCareerRoadmap(targetRole, jobText, token) {
    try {
        const response = await apiConnector("POST", CareerApi.roadmap, { targetRole, jobText }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data
    } catch (error) {
        logApiError("Error building the roadmap", error)
        toast.error("Could not build the roadmap, please try again.")
        return null
    }
}

export async function GetInterviewFeedback(question, answer, token) {
    try {
        const response = await apiConnector("POST", CareerApi.interviewFeedback, { question, answer }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.feedback
    } catch (error) {
        logApiError("Error reviewing the answer", error)
        toast.error("Could not review your answer, please try again.")
        return null
    }
}

export async function AddCareerFollowUp(followUp, token) {
    try {
        const response = await apiConnector("POST", CareerApi.followUps, followUp, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return true
    } catch (error) {
        logApiError("Error adding the follow-up", error)
        toast.error("Could not add that reminder, please try again.")
        return false
    }
}

export async function ToggleCareerFollowUp(followUpId, completed, token) {
    try {
        const response = await apiConnector("PATCH", `${CareerApi.followUps}/${followUpId}`, { completed }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return true
    } catch (error) {
        logApiError("Error updating the follow-up", error)
        toast.error("Could not update that reminder, please try again.")
        return false
    }
}

export async function ShareCareerProfile(token) {
    try {
        const response = await apiConnector("POST", CareerApi.profileShare, null, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.shareId
    } catch (error) {
        logApiError("Error sharing the career profile", error)
        toast.error("Could not share your profile, please try again.")
        return null
    }
}
