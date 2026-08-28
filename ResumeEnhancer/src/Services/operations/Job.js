import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { JobData } from '../Apis/JobApi.js'
import {
    setMyJobs,
    removeMyJob,
    setCurrentJob,
    setJobApplicants,
    setJobAnalytics,
    setRecruiterOverview,
    patchJobApplicant,
    patchJobApplicantsBulk,
    setPublicJobs,
    setCurrentPublicJob,
    setMyApplications,
    setLoading,
} from '../../Slices/jobSlice.js'

const {
    createJob, listMyJobs, getJob, updateJob, publishJob, closeJob, deleteJob, getJobApplicants,
    getJobAnalytics, getRecruiterOverviewAnalytics, inviteApplicantToTest, setApplicationOutcome,
    bulkInviteApplicants, bulkApplicationOutcome, listPublicJobs, getPublicJob, applyToJob,
    listMyApplications,
} = JobData

// ---------------------------------------------------------------------------
// recruiter-side sir
// ---------------------------------------------------------------------------

export function CreateJob(jobPayload, token, navigate, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", createJob, jobPayload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Job created")
            if (navigate) navigate(`/Recruiter/Jobs/${response.data.job._id}`)
            return response.data.job
        } catch (error) {
            logApiError("Error creating the job", error)
            toast.error(error?.response?.data?.message || "Could not create the job")
            return null
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function GetMyJobs(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", listMyJobs, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setMyJobs(response.data.jobs))
        } catch (error) {
            logApiError("Error fetching your jobs", error)
            toast.error(error?.response?.data?.message || "Could not load your jobs")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetJob(jobId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${getJob}/${jobId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentJob(response.data.job))
        } catch (error) {
            logApiError("Error fetching the job", error)
            toast.error(error?.response?.data?.message || "Could not load the job")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function UpdateJob(jobId, jobPayload, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("PATCH", `${updateJob}/${jobId}`, jobPayload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Job updated")
            dispatch(setCurrentJob(response.data.job))
        } catch (error) {
            logApiError("Error updating the job", error)
            toast.error(error?.response?.data?.message || "Could not update the job")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function PublishJob(jobId, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", `${publishJob}/${jobId}/publish`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Job published — candidates can now find and apply to it")
            dispatch(setCurrentJob(response.data.job))
            return true
        } catch (error) {
            logApiError("Error publishing the job", error)
            toast.error(error?.response?.data?.message || "Could not publish the job")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function CloseJob(jobId, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", `${closeJob}/${jobId}/close`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Job closed")
            dispatch(setCurrentJob(response.data.job))
        } catch (error) {
            logApiError("Error closing the job", error)
            toast.error(error?.response?.data?.message || "Could not close the job")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// a mistake sir — deletes the job outright, every applicant gets an email that it was withdrawn
// (best-effort, backend-side, see controllers/Job.js's deleteJob). Confirmation dialog lives in
// the calling component (JobList.jsx), same pattern as every other destructive action here.
export function DeleteJob(jobId, token, navigate, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("DELETE", `${deleteJob}/${jobId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Job deleted — every applicant has been notified")
            dispatch(removeMyJob(jobId))
            if (navigate) navigate('/Recruiter')
            return true
        } catch (error) {
            logApiError("Error deleting the job", error)
            toast.error(error?.response?.data?.message || "Could not delete the job")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function GetJobApplicants(jobId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${getJobApplicants}/${jobId}/applicants`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setJobApplicants({ applicants: response.data.applicants, jobHasTest: response.data.jobHasTest, testPublished: response.data.testPublished }))
        } catch (error) {
            logApiError("Error fetching applicants", error)
            toast.error(error?.response?.data?.message || "Could not load the applicants")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetJobAnalytics(jobId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${getJobAnalytics}/${jobId}/analytics`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setJobAnalytics(response.data.analytics))
        } catch (error) {
            logApiError("Error fetching job analytics", error)
            toast.error(error?.response?.data?.message || "Could not load the job's analytics")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// totals + per-job breakdown ACROSS every job the recruiter has posted sir — the landing view
// for "how am I doing overall", separate from GetJobAnalytics' single-job funnel
export function GetRecruiterOverviewAnalytics(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", getRecruiterOverviewAnalytics, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setRecruiterOverview(response.data.analytics))
        } catch (error) {
            logApiError("Error fetching your analytics overview", error)
            toast.error(error?.response?.data?.message || "Could not load your analytics overview")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function SetApplicationOutcome(applicationId, status, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("PATCH", `${setApplicationOutcome}/${applicationId}/status`, { status }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(status === 'hired' ? "Candidate marked as hired" : "Candidate rejected")
            dispatch(patchJobApplicant({ applicationId, status }))
            return true
        } catch (error) {
            logApiError("Error updating the application", error)
            toast.error(error?.response?.data?.message || "Could not update the application")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// invites several 'applied' candidates to the job's test at once sir — same skipped-vs-invited
// message shape the backend returns, applicants list patched in place, no full refetch needed
export function BulkInviteApplicantsToTest(applicationIds, jobId, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", `${bulkInviteApplicants}/${jobId}/applicants/bulk-invite`, { applicationIds }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(patchJobApplicantsBulk({ applicationIds: response.data.invited, status: 'invited_to_test' }))
            return true
        } catch (error) {
            logApiError("Error bulk-inviting candidates", error)
            toast.error(error?.response?.data?.message || "Could not invite the selected candidates")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// hires/rejects several 'completed_test' candidates at once sir — same shape as above
export function BulkSetApplicationOutcome(applicationIds, status, jobId, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("PATCH", `${bulkApplicationOutcome}/${jobId}/applicants/bulk-status`, { applicationIds, status }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(patchJobApplicantsBulk({ applicationIds: response.data.updated, status }))
            return true
        } catch (error) {
            logApiError("Error bulk-updating applications", error)
            toast.error(error?.response?.data?.message || "Could not update the selected candidates")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function InviteApplicantToTest(applicationId, jobId, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", `${inviteApplicantToTest}/${applicationId}/invite`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Candidate invited to take the test")
            dispatch(GetJobApplicants(jobId, token))
        } catch (error) {
            logApiError("Error inviting the candidate", error)
            toast.error(error?.response?.data?.message || "Could not invite the candidate")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// ---------------------------------------------------------------------------
// public sir — no auth required
// ---------------------------------------------------------------------------

export function GetPublicJobs(params = {}) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", listPublicJobs, null, {}, params)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setPublicJobs({ jobs: response.data.jobs, pagination: response.data.pagination }))
        } catch (error) {
            logApiError("Error fetching jobs", error)
            toast.error(error?.response?.data?.message || "Could not load jobs")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetPublicJob(jobId) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${getPublicJob}/${jobId}`)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentPublicJob(response.data.job))
        } catch (error) {
            logApiError("Error fetching the job", error)
            toast.error(error?.response?.data?.message || "Could not load the job")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// ---------------------------------------------------------------------------
// candidate-side sir
// ---------------------------------------------------------------------------

// the structured multi-step application form sir — resumeFile rides as a real multipart file
// (req.files.resume server-side), everything else (experienceLevel/address/expectedSalary/
// education/currentCtc/workHistory) is JSON-stringified into one 'data' field, parsed back into
// an object server-side (Routes/Job.js's parseMultipartJson) before Zod ever validates it —
// mixing a file upload with a nested-object payload doesn't work as plain multipart fields.
export function ApplyToJob(jobId, token, formPayload, resumeFile, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
        try {
            const formData = new FormData()
            formData.append("data", JSON.stringify(formPayload))
            formData.append("resume", resumeFile)

            const response = await apiConnector("POST", `${applyToJob}/${jobId}/apply`, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Application submitted")
            return true
        } catch (error) {
            logApiError("Error applying to the job", error)
            toast.error(error?.response?.data?.message || "Could not apply to the job")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function GetMyApplications(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", listMyApplications, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setMyApplications(response.data.applications))
        } catch (error) {
            logApiError("Error fetching your applications", error)
            toast.error(error?.response?.data?.message || "Could not load your applications")
        } finally {
            dispatch(setLoading(false))
        }
    }
}
