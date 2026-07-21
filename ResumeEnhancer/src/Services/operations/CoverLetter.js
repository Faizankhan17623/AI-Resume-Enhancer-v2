import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setContent, setLetterId, setGenericCheck, setAllLetters, setLoading, setGenerating } from '../../Slices/coverLetterSlice.js'
import { CoverLetterData } from '../Apis/CoverLetterApi.js'

const { generate, all, single } = CoverLetterData

// upload the resume PDF + JD and get a tailored cover letter back sir — Pro+ feature
export function GenerateCoverLetter(pdfFile, jd, token) {
    return async (dispatch) => {
        dispatch(setGenerating(true))
        const toastId = toast.loading("Writing your cover letter...")
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)

            const response = await apiConnector("POST", generate, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setContent(response.data.content))
            dispatch(setLetterId(response.data.coverLetterId))
            dispatch(setGenericCheck(response.data.genericCheck || null))
            toast.success("Your cover letter is ready")
        } catch (error) {
            logApiError("Error generating the cover letter", error)
            toast.error(error?.response?.data?.message || "Could not generate the cover letter")
        } finally {
            dispatch(setGenerating(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetAllCoverLetters(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", all, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllLetters(response.data.letters))
        } catch (error) {
            logApiError("Error fetching the cover letters", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetSingleCoverLetter(coverLetterId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${single}/${coverLetterId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setContent(response.data.letter.content))
            dispatch(setLetterId(response.data.letter._id))
        } catch (error) {
            logApiError("Error fetching the cover letter", error)
            toast.error(error?.response?.data?.message || "Could not load the cover letter")
        } finally {
            dispatch(setLoading(false))
        }
    }
}
