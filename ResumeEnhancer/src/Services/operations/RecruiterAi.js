import toast from "react-hot-toast"
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { RecruiterAiData } from '../Apis/RecruiterAiApi.js'

const { jobDescription, interviewQuestions, candidateSummary } = RecruiterAiData

const isUpgradeError = (error) => error?.response?.data?.code === 'UPGRADE_AVAILABLE' || error?.response?.data?.code === 'LIMIT_RENEWS'

// three Pro/ProMax AI upsells sir — each returns null on failure so the caller can just check
// truthiness, same shape as other one-shot AI operations in this app (e.g. GetReferralStats)

export function GenerateJobDescription(title, employmentType, mustHaves, token) {
    return async () => {
        const toastId = toast.loading("Drafting the description...")
        try {
            const response = await apiConnector("POST", jobDescription, { title, employmentType, mustHaves }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.description
        } catch (error) {
            logApiError("Error drafting the job description", error)
            toast.error(error?.response?.data?.message || "Could not draft the description")
            return null
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GenerateInterviewQuestions(jobId, questionCount, token) {
    return async () => {
        const toastId = toast.loading("Generating questions...")
        try {
            const response = await apiConnector("POST", interviewQuestions, { jobId, questionCount }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.questions
        } catch (error) {
            logApiError("Error generating interview questions", error)
            toast.error(error?.response?.data?.message || "Could not generate questions")
            return null
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GenerateCandidateSummary(applicationId, token) {
    return async () => {
        const toastId = toast.loading("Summarizing...")
        try {
            const response = await apiConnector("GET", `${candidateSummary}/${applicationId}/summary`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.summary
        } catch (error) {
            logApiError("Error summarizing the candidate", error)
            toast.error(error?.response?.data?.message || "Could not summarize this candidate")
            return null
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export { isUpgradeError }
