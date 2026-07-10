import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { setResumes, setLoading, setSaving } from '../../Slices/resumeSlice.js'
import { ResumeData } from '../Apis/ResumeApi.js'

const { save, all, update, remove } = ResumeData

// upload a PDF once and save its parsed text for reuse sir — no AI credit spent
export function SaveResume(pdfFile, label, token) {
    return async (dispatch) => {
        dispatch(setSaving(true))
        const toastId = toast.loading("Saving your resume...")
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            if (label) formData.append("label", label)

            const response = await apiConnector("POST", save, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume saved")
            dispatch(GetResumes(token))
            return response.data.resume
        } catch (error) {
            console.error("Error saving the resume", error)
            toast.error(error?.response?.data?.message || "Could not save the resume")
            return null
        } finally {
            dispatch(setSaving(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetResumes(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", all, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setResumes(response.data.resumes))
        } catch (error) {
            console.error("Error fetching your resumes", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function RenameResume(resumeId, label, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${update}/${resumeId}`, { label }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume renamed")
            dispatch(GetResumes(token))
        } catch (error) {
            console.error("Error renaming the resume", error)
            toast.error(error?.response?.data?.message || "Could not rename the resume")
        }
    }
}

export function SetDefaultResume(resumeId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${update}/${resumeId}`, { isDefault: true }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Default resume updated")
            dispatch(GetResumes(token))
        } catch (error) {
            console.error("Error setting the default resume", error)
            toast.error(error?.response?.data?.message || "Could not update the default resume")
        }
    }
}

export function DeleteResume(resumeId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${remove}/${resumeId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume deleted")
            dispatch(GetResumes(token))
        } catch (error) {
            console.error("Error deleting the resume", error)
            toast.error(error?.response?.data?.message || "Could not delete the resume")
        }
    }
}
