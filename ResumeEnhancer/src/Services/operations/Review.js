import toast from "react-hot-toast";
import { apiConnector, axiosinstance } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import {
    setReview, setReviewId, setFormattingCheck, setShareState, setAllReviews, setProgress, setLoading,
    setGrammar, setGrammarChecking, setStreak, setLeaderboard, setWeeklyReviewsLeaderboard, setStreaksLeaderboard
} from '../../Slices/reviewSlice.js'
import { AtsReview, ReviewHistory, GrammarCheckApi, StreakApi, LeaderboardApi } from '../Apis/ReviewApi.js'
import { ResumeData } from '../Apis/ResumeApi.js'

const { createreview } = AtsReview
const { reviewFromResume } = ResumeData
const { allreviews, progress, singlereview, downloadpdf, sharereview, publicreview } = ReviewHistory
const { checkgrammar } = GrammarCheckApi
const { streak } = StreakApi
const { leaderboard, weeklyReviews, streaks } = LeaderboardApi

// the big one sir — upload the PDF + JD and get the full ATS review back
// FormData because the backend reads req.files.PDf
export function CreateReview(pdfFile, jd, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Analyzing your resume — this takes a few seconds...")
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)

            const response = await apiConnector("POST", createreview, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setReview(response.data.review))
            dispatch(setReviewId(response.data.reviewId))
            dispatch(setFormattingCheck(response.data.formattingCheck))

            toast.success("Your review is ready")
            if (navigate && response.data.reviewId) navigate(`/Dashboard/Review/${response.data.reviewId}`)
        } catch (error) {
            logApiError("Error creating the review", error)
            toast.error(error?.response?.data?.message || "Could not analyze the resume")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// same as CreateReview sir, but re-scores a previously saved resume — no PDF re-upload needed
export function CreateReviewFromResume(resumeId, jd, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Analyzing your resume — this takes a few seconds...")
        try {
            const response = await apiConnector("POST", `${reviewFromResume}/${resumeId}`, { jd }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setReview(response.data.review))
            dispatch(setReviewId(response.data.reviewId))
            dispatch(setFormattingCheck(response.data.formattingCheck))

            toast.success("Your review is ready")
            if (navigate && response.data.reviewId) navigate(`/Dashboard/Review/${response.data.reviewId}`)
        } catch (error) {
            logApiError("Error creating the review", error)
            toast.error(error?.response?.data?.message || "Could not analyze the resume")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// free, instant, no AI credit spent sir — runs right after PDF upload, before the user
// commits a credit to the full ATS review
export function CheckGrammar(pdfFile, token) {
    return async (dispatch) => {
        dispatch(setGrammarChecking(true))
        dispatch(setGrammar(null))
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)

            const response = await apiConnector("POST", checkgrammar, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setGrammar({ score: response.data.score, issues: response.data.issues }))
        } catch (error) {
            logApiError("Error checking grammar", error)
            // silent sir — this is a nice-to-have pre-check, don't block the user's flow with a toast
        } finally {
            dispatch(setGrammarChecking(false))
        }
    }
}

export function GetAllReviews(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", allreviews, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllReviews(response.data.reviews))
        } catch (error) {
            logApiError("Error fetching the reviews", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetProgress(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", progress, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setProgress(response.data))
        } catch (error) {
            logApiError("Error fetching the progress", error)
        }
    }
}

export function GetSingleReview(reviewId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${singlereview}/${reviewId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setReview(response.data.review.review))
            dispatch(setReviewId(response.data.review._id))
            dispatch(setFormattingCheck(response.data.review.formattingCheck))
            dispatch(setShareState({
                isPublic: response.data.review.isPublic,
                shareId: response.data.review.shareId
            }))
        } catch (error) {
            logApiError("Error fetching the review", error)
            toast.error(error?.response?.data?.message || "Could not load the review")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// flips the review's public share link on/off sir
export function ToggleShare(reviewId, token, audience) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("POST", `${sharereview}/${reviewId}/share`, audience ? { audience } : null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setShareState({
                isPublic: response.data.isPublic,
                shareId: response.data.shareId,
                shareAudience: response.data.shareAudience,
            }))

            toast.success(response.data.isPublic ? "Share link created" : "Share link turned off")
        } catch (error) {
            logApiError("Error toggling the share link", error)
            toast.error(error?.response?.data?.message || "Could not update the share link")
        }
    }
}

// re-frames an ALREADY-shared link for a different audience sir, without unsharing it
export function UpdateShareAudience(reviewId, token, audience) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${sharereview}/${reviewId}/share-audience`, { audience }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setShareState({ isPublic: true, shareAudience: response.data.shareAudience }))
            toast.success("Share link updated")
        } catch (error) {
            logApiError("Error updating the share audience", error)
            toast.error(error?.response?.data?.message || "Could not update the share link")
        }
    }
}

// public report card sir — no auth, no token needed
export function GetPublicReview(shareId) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${publicreview}/${shareId}`)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.report
        } catch (error) {
            logApiError("Error fetching the shared report", error)
            toast.error(error?.response?.data?.message || "This shared report was not found")
            return null
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// the activity streak badge sir — current/longest streak for the dashboard
export function GetStreak(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", streak, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setStreak({
                currentStreak: response.data.currentStreak,
                longestStreak: response.data.longestStreak,
                lastActivityDate: response.data.lastActivityDate
            }))
        } catch (error) {
            logApiError("Error fetching the streak", error)
        }
    }
}

// anonymized top-score leaderboard sir — no resume content, no identity
export function GetLeaderboard(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", leaderboard, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setLeaderboard(response.data.leaderboard))
        } catch (error) {
            logApiError("Error fetching the leaderboard", error)
            toast.error(error?.response?.data?.message || "Could not load the leaderboard")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// "resumes reviewed this week" board sir — rewards activity, counts every review run in the last 7 days
export function GetWeeklyReviewsLeaderboard(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", weeklyReviews, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setWeeklyReviewsLeaderboard(response.data.leaderboard))
        } catch (error) {
            logApiError("Error fetching the weekly reviews leaderboard", error)
            toast.error(error?.response?.data?.message || "Could not load the weekly leaderboard")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// longest current activity streaks sir
export function GetStreaksLeaderboard(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", streaks, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setStreaksLeaderboard(response.data.leaderboard))
        } catch (error) {
            logApiError("Error fetching the streaks leaderboard", error)
            toast.error(error?.response?.data?.message || "Could not load the streaks leaderboard")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// downloads the styled PDF sir — blob response, saved through a hidden anchor
export async function DownloadReviewPdf(reviewId, token) {
    const toastId = toast.loading("Preparing your PDF...")
    try {
        // straight on the instance sir — the connector has no responseType and the PDF needs blob
        const response = await axiosinstance({
            method: "GET",
            url: `${downloadpdf}/${reviewId}/pdf`,
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob"
        })

        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ats-review-${reviewId}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        toast.success("PDF downloaded")
    } catch (error) {
        logApiError("Error downloading the PDF", error)
        // Basic plan gets the upgrade nudge from the backend sir
        toast.error(error?.response?.status === 403
            ? "PDF export is a Pro feature, please upgrade your plan"
            : "Could not download the PDF")
    } finally {
        toast.dismiss(toastId)
    }
}
