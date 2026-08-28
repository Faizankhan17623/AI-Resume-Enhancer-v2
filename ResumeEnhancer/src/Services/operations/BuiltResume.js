import toast from "react-hot-toast";
import { apiConnector, axiosinstance } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setBuiltResumes, setCurrentResume, setLoading, setSaving, setGenerating, patchCurrentResume } from '../../Slices/builtResumeSlice.js'
import { setReview, setReviewId, setFormattingCheck, setLoading as setReviewLoading } from '../../Slices/reviewSlice.js'
import { BuiltResumeData } from '../Apis/BuiltResumeApi.js'

const { create, all, single, update, remove, generate, tailor, review, downloadDocx, photo, versions, singleVersion, restoreVersion, duplicate, portfolioShare, publicPortfolio } = BuiltResumeData

// create an (almost) empty resume right after picking a template sir, then the caller navigates to the editor.
// color is optional — carried over when the user picked an accent on the dedicated Templates page.
export function CreateBuiltResume(templateId, token, navigate, color) {
    return async () => {
        try {
            const response = await apiConnector("POST", create, { templateId, ...(color ? { color } : {}) }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            if (navigate) navigate(`/Dashboard/Build-Resume/${response.data.resume._id}`)
            return response.data.resume
        } catch (error) {
            logApiError("Error creating the resume", error)
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
            logApiError("Error fetching your built resumes", error)
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
            logApiError("Error fetching the resume", error)
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
            logApiError("Error saving the resume", error)
            if (!silent) toast.error(error?.response?.data?.message || "Could not save the resume")
            return null
        } finally {
            dispatch(setSaving(false))
        }
    }
}

// silent + skipRefetch let bulk-delete reuse this one item at a time without stacking
// a toast and a full list refetch per item sir — see handleBulkDelete in BuiltResumes.jsx
export function DeleteBuiltResume(resumeId, token, { silent = false, skipRefetch = false } = {}) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${remove}/${resumeId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            if (!silent) toast.success("Resume deleted")
            if (!skipRefetch) dispatch(GetBuiltResumes(token))
            return true
        } catch (error) {
            logApiError("Error deleting the resume", error)
            if (!silent) toast.error(error?.response?.data?.message || "Could not delete the resume")
            return false
        }
    }
}

// clones a resume sir — e.g. to branch a variant for a different job while keeping the
// original untouched. Refreshes the list so the new copy shows up right away.
export function DuplicateBuiltResume(resumeId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("POST", `${duplicate}/${resumeId}/duplicate`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume duplicated")
            dispatch(GetBuiltResumes(token))
        } catch (error) {
            logApiError("Error duplicating the resume", error)
            toast.error(error?.response?.data?.message || "Could not duplicate the resume")
        }
    }
}

// lists saved snapshots for the version-history panel sir — lightweight (title + savedAt only)
export function GetBuiltResumeVersions(resumeId, token) {
    return async () => {
        try {
            const response = await apiConnector("GET", `${versions}/${resumeId}/versions`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.versions
        } catch (error) {
            logApiError("Error fetching resume versions", error)
            return []
        }
    }
}

// fetches ONE version's full content sir — separate from the list above on purpose (see
// controllers/BuiltResume.js's getBuiltResumeVersion), only called when the user actually opens
// the diff view for a specific version, not on every dropdown open
export function GetBuiltResumeVersion(resumeId, versionId, token) {
    return async () => {
        try {
            const response = await apiConnector("GET", `${singleVersion}/${resumeId}/versions/${versionId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.version
        } catch (error) {
            logApiError("Error fetching the resume version", error)
            toast.error(error?.response?.data?.message || "Could not load this version")
            return null
        }
    }
}

// rolls the resume's content fields back to a saved snapshot sir — template/color/photo are
// left as they currently are, only wording/experience/education/etc. change
export function RestoreBuiltResumeVersion(resumeId, versionId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("POST", `${restoreVersion}/${resumeId}/versions/${versionId}/restore`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentResume(response.data.resume))
            toast.success("Resume restored to the selected version")
            return true
        } catch (error) {
            logApiError("Error restoring the resume version", error)
            toast.error(error?.response?.data?.message || "Could not restore this version")
            return false
        }
    }
}

// feature 1 sir — raw career info in, a full drafted resume out (consumes a credit)
export function GenerateResume(rawInfo, targetRole, templateId, token, navigate, color) {
    return async (dispatch) => {
        dispatch(setGenerating(true))
        try {
            const response = await apiConnector("POST", generate, { rawInfo, targetRole, templateId, ...(color ? { color } : {}) }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Resume drafted")
            if (navigate) navigate(`/Dashboard/Build-Resume/${response.data.resume._id}`)
            return response.data.resume
        } catch (error) {
            logApiError("Error generating the resume", error)
            toast.error(error?.response?.data?.message || "Could not generate the resume")
            return null
        } finally {
            dispatch(setGenerating(false))
        }
    }
}

// feature 2 sir — old resume PDF + a JD in, a tailored rewrite out (consumes a credit)
export function TailorResume(pdfFile, jd, templateId, token, navigate, color) {
    return async (dispatch) => {
        dispatch(setGenerating(true))
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)
            formData.append("templateId", templateId)
            if (color) formData.append("color", color)

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
            logApiError("Error tailoring the resume", error)
            toast.error(error?.response?.data?.message || "Could not tailor the resume")
            return null
        } finally {
            dispatch(setGenerating(false))
        }
    }
}

// score a built resume against a JD sir — same ATS review pipeline as an upload, just the data
// is already structured. Consumes a credit, lands on the exact same Report page as any other review.
export function ReviewBuiltResume(resumeId, jd, token, navigate) {
    return async (dispatch) => {
        dispatch(setReviewLoading(true))
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
            logApiError("Error reviewing the resume", error)
            toast.error(error?.response?.data?.message || "Could not analyze the resume")
        } finally {
            dispatch(setReviewLoading(false))
        }
    }
}

// uploads/replaces the headshot sir — multipart form, same req.files?.X pattern the PDF uploads use
export function UploadBuiltResumePhoto(resumeId, file, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const formData = new FormData()
            formData.append("photo", file)

            const response = await apiConnector("POST", `${photo}/${resumeId}/photo`, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(patchCurrentResume({ photoUrl: response.data.photoUrl }))
            toast.success("Photo uploaded")
        } catch (error) {
            logApiError("Error uploading the photo", error)
            toast.error(error?.response?.data?.message || "Could not upload the photo")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function RemoveBuiltResumePhoto(resumeId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${photo}/${resumeId}/photo`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(patchCurrentResume({ photoUrl: '' }))
            toast.success("Photo removed")
        } catch (error) {
            logApiError("Error removing the photo", error)
            toast.error(error?.response?.data?.message || "Could not remove the photo")
        }
    }
}

// flips a built resume's public portfolio link on/off sir — same pattern as Review's ToggleShare.
// Pro/ProMax only, the 403 from a Basic account surfaces via the toast below same as any other
// plan-gated action.
export function TogglePortfolioShare(resumeId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("POST", `${portfolioShare}/${resumeId}/portfolio-share`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(patchCurrentResume({ isPublic: response.data.isPublic, shareId: response.data.shareId }))
            toast.success(response.data.isPublic ? "Portfolio link created" : "Portfolio link turned off")
        } catch (error) {
            logApiError("Error toggling the portfolio link", error)
            toast.error(error?.response?.data?.message || "Could not update the portfolio link")
        }
    }
}

// public portfolio page sir — no auth, no token needed
export function GetPublicPortfolio(shareId) {
    return async () => {
        try {
            const response = await apiConnector("GET", `${publicPortfolio}/${shareId}`)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.resume
        } catch (error) {
            logApiError("Error fetching the shared portfolio", error)
            return null
        }
    }
}

// downloads the resume as a real .docx file sir — blob response, same pattern as DownloadReviewPdf
export async function DownloadBuiltResumeDocx(resumeId, title, token, onLoadingChange) {
    onLoadingChange?.(true)
    try {
        const response = await axiosinstance({
            method: "GET",
            url: `${downloadDocx}/${resumeId}/docx`,
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob"
        })

        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${(title || 'resume').replace(/[^a-z0-9-_]+/gi, '_')}.docx`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        toast.success("DOCX downloaded")
    } catch (error) {
        logApiError("Error downloading the DOCX", error)
        toast.error(error?.response?.data?.message || "Could not download the DOCX")
    } finally {
        onLoadingChange?.(false)
    }
}
