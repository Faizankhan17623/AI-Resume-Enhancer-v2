import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { setBuiltResumes, setCurrentResume, setLoading, setSaving, setGenerating } from '../../Slices/builtResumeSlice.js'
import { setReview, setReviewId, setFormattingCheck, setLoading as setReviewLoading } from '../../Slices/reviewSlice.js'
import { BuiltResumeData } from '../Apis/BuiltResumeApi.js'

const { create, all, single, update, remove, generate, tailor, review } = BuiltResumeData

// create an (almost) empty resume right after picking a template sir, then the caller navigates to the editor
export function CreateBuiltResume(templateId, token, navigate) {
    return async () => {
        try {
            const response = await apiConnector("POST", create, { templateId }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            if (navigate) navigate(`/Dashboard/Build-Resume/${response.data.resume._id}`)
            return response.data.resume
        } catch (error) {
            console.error("Error creating the resume", error)
            toast.error(error?.response?.data?.message || "Could not create the resume")
            return null
        }
    }
}

export function GetBuiltResumes(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", all, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setBuiltResumes(response.data.resumes))
        } catch (error) {
            console.error("Error fetching your built resumes", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetBuiltResume(resumeId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${single}/${resumeId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentResume(response.data.resume))
        } catch (error) {
            console.error("Error fetching the resume", error)
            toast.error(error?.response?.data?.message || "Could not load the resume")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// full-document save sir — the editor debounces calls to this so it fires a few seconds after typing stops
export function SaveBuiltResume(resumeId, data, token, { silent = false } = {}) {
    return async (dispatch) => {
        dispatch(setSaving(true))
        try {
            const response = await apiConnector("PUT", `${update}/${resumeId}`, data, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            if (!silent) toast.success("Saved")
            return response.data.resume
        } catch (error) {
            console.error("Error saving the resume", error)
            if (!silent) toast.error(error?.response?.data?.message || "Could not save the resume")
            return null
        } finally {
            dispatch(setSaving(false))
        }
    }
}

export function DeleteBuiltResume(resumeId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${remove}/${resumeId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume deleted")
            dispatch(GetBuiltResumes(token))
        } catch (error) {
            console.error("Error deleting the resume", error)
            toast.error(error?.response?.data?.message || "Could not delete the resume")
        }
    }
}

// feature 1 sir — raw career info in, a full drafted resume out (consumes a credit)
export function GenerateResume(rawInfo, targetRole, templateId, token, navigate) {
    return async (dispatch) => {
        dispatch(setGenerating(true))
        const toastId = toast.loading("Drafting your resume...")
        try {
            const response = await apiConnector("POST", generate, { rawInfo, targetRole, templateId }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume drafted")
            if (navigate) navigate(`/Dashboard/Build-Resume/${response.data.resume._id}`)
            return response.data.resume
        } catch (error) {
            console.error("Error generating the resume", error)
            toast.error(error?.response?.data?.message || "Could not generate the resume")
            return null
        } finally {
            dispatch(setGenerating(false))
            toast.dismiss(toastId)
        }
    }
}

// feature 2 sir — old resume PDF + a JD in, a tailored rewrite out (consumes a credit)
export function TailorResume(pdfFile, jd, templateId, token, navigate) {
    return async (dispatch) => {
        dispatch(setGenerating(true))
        const toastId = toast.loading("Tailoring your resume to this job...")
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)
            formData.append("templateId", templateId)

            const response = await apiConnector("POST", tailor, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume tailored to the job")
            if (navigate) navigate(`/Dashboard/Build-Resume/${response.data.resume._id}`)
            return response.data.resume
        } catch (error) {
            console.error("Error tailoring the resume", error)
            toast.error(error?.response?.data?.message || "Could not tailor the resume")
            return null
        } finally {
            dispatch(setGenerating(false))
            toast.dismiss(toastId)
        }
    }
}

// score a built resume against a JD sir — same ATS review pipeline as an upload, just the data
// is already structured. Consumes a credit, lands on the exact same Report page as any other review.
export function ReviewBuiltResume(resumeId, jd, token, navigate) {
    return async (dispatch) => {
        dispatch(setReviewLoading(true))
        const toastId = toast.loading("Analyzing your resume — this takes a few seconds...")
        try {
            const response = await apiConnector("POST", `${review}/${resumeId}/review`, { jd }, {
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
            console.error("Error reviewing the resume", error)
            toast.error(error?.response?.data?.message || "Could not analyze the resume")
        } finally {
            dispatch(setReviewLoading(false))
            toast.dismiss(toastId)
        }
    }
}
