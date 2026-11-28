import { createSlice } from "@reduxjs/toolkit";

// deliberately separate from jobSearchSlice.js sir — that's the unrelated private Tavily
// web-search feature, this is the real recruiter-posted job board + applications state
const initialState = {
    // recruiter-side sir
    myJobs: [],
    // a failed fetch used to leave the list at its empty initial value with no signal sir — each
    // field below pairs with one list/object above, same reasoning throughout this slice
    myJobsLoadError: false,
    currentJob: null,
    jobApplicants: [],
    jobApplicantsLoadError: false,
    // whether the CURRENT job (whichever one jobApplicants is for) has a proctored test attached
    // sir — tests are optional now, this drives whether "Invite to test" even shows
    jobHasTest: false,
    // whether that attached test has actually been PUBLISHED sir — a test can be attached but
    // still sitting in draft (no inviteCode yet), in which case invite must be blocked with an
    // explanation rather than silently flipping status and sending no email
    testPublished: false,
    jobAnalytics: null,
    jobAnalyticsLoadError: false,
    recruiterOverview: null,
    recruiterOverviewLoadError: false,

    // public board sir
    publicJobs: [],
    publicJobsPagination: { page: 1, limit: 20, total: 0, pages: 1 },
    currentPublicJob: null,

    // candidate-side sir
    myApplications: [],
    myApplicationsLoadError: false,
    // just the ids sir — cheap to carry on every board/detail page for an instant "is this saved"
    // check, without needing the full populated job on pages that don't show the Saved Jobs list
    savedJobIds: [],
    savedJobs: [],

    // `loading` stays for GetPublicJobs/GetPublicJob only sir — the page-blocking fetches.
    // myApplicationsLoading/savedJobsLoading added per 2026-11-16 audit: GetMyApplications and
    // GetSavedJobs used to share this same `loading` flag. JobBoard.jsx/JobDetail.jsx fire
    // GetPublicJob(s) AND these two in separate effects on mount; whichever of the smaller
    // background fetches resolved first flipped `loading` back to false while GetPublicJob(s)
    // was still in flight, dropping the page out of its loading state and briefly rendering an
    // empty "no job" view before the real list/job arrived. MyApplications.jsx/SavedJobs.jsx
    // (Dashboard) still need their OWN dedicated flags since they read loading standalone.
    loading: false,
    myApplicationsLoading: false,
    savedJobsLoading: false,
};

const jobSlice = createSlice({
    name: "job",
    initialState: initialState,
    reducers: {
        setMyJobs(state, value) {
            state.myJobs = value.payload
        },
        setMyJobsLoadError(state, value) {
            state.myJobsLoadError = value.payload
        },
        // after a successful DELETE sir — pulls the job straight out of the list, no refetch needed
        removeMyJob(state, value) {
            state.myJobs = state.myJobs.filter((job) => job._id !== value.payload)
        },
        setCurrentJob(state, value) {
            state.currentJob = value.payload
        },
        setJobApplicants(state, value) {
            state.jobApplicants = value.payload.applicants
            state.jobHasTest = value.payload.jobHasTest
            state.testPublished = value.payload.testPublished
        },
        setJobApplicantsLoadError(state, value) {
            state.jobApplicantsLoadError = value.payload
        },
        setJobAnalytics(state, value) {
            state.jobAnalytics = value.payload
        },
        setJobAnalyticsLoadError(state, value) {
            state.jobAnalyticsLoadError = value.payload
        },
        setRecruiterOverview(state, value) {
            state.recruiterOverview = value.payload
        },
        setRecruiterOverviewLoadError(state, value) {
            state.recruiterOverviewLoadError = value.payload
        },
        // Hire/Reject updates the one row in place sir — same pattern as an optimistic-ish
        // local patch after a successful PATCH, no full refetch needed
        patchJobApplicant(state, value) {
            const { applicationId, status } = value.payload
            const app = state.jobApplicants.find((a) => a._id === applicationId)
            if (app) app.status = status
        },
        // ToggleShortlist sir — same in-place-patch shape as patchJobApplicant above, kept as its
        // own reducer rather than generalizing that one since shortlisted is unrelated to status
        patchJobApplicantShortlist(state, value) {
            const { applicationId, shortlisted } = value.payload
            const app = state.jobApplicants.find((a) => a._id === applicationId)
            if (app) app.shortlisted = shortlisted
        },
        // same in-place patch shape as patchJobApplicantShortlist above sir, for the
        // recruiter's private notes field
        patchJobApplicantNotes(state, value) {
            const { applicationId, recruiterNotes } = value.payload
            const app = state.jobApplicants.find((a) => a._id === applicationId)
            if (app) app.recruiterNotes = recruiterNotes
        },
        // same in-place patch as patchJobApplicant above sir, just for many rows at once after
        // a bulk invite/hire/reject — avoids a full applicants refetch for the common case
        patchJobApplicantsBulk(state, value) {
            const { applicationIds, status } = value.payload
            const idSet = new Set(applicationIds)
            state.jobApplicants.forEach((a) => {
                if (idSet.has(a._id)) a.status = status
            })
        },
        setPublicJobs(state, value) {
            state.publicJobs = value.payload.jobs
            state.publicJobsPagination = value.payload.pagination
        },
        setCurrentPublicJob(state, value) {
            state.currentPublicJob = value.payload
        },
        setMyApplications(state, value) {
            state.myApplications = value.payload
        },
        setMyApplicationsLoadError(state, value) {
            state.myApplicationsLoadError = value.payload
        },
        setSavedJobs(state, value) {
            state.savedJobs = value.payload
            state.savedJobIds = value.payload.map((job) => job._id)
        },
        // ToggleSavedJob sir — in-place patch of just the id list, no refetch of the full saved
        // list needed for a save/unsave click on the board or detail page
        patchSavedJobId(state, value) {
            const { jobId, saved } = value.payload
            state.savedJobIds = saved
                ? [...state.savedJobIds, jobId]
                : state.savedJobIds.filter((id) => id !== jobId)
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setMyApplicationsLoading(state, value) {
            state.myApplicationsLoading = value.payload
        },
        setSavedJobsLoading(state, value) {
            state.savedJobsLoading = value.payload
        },
    }
})

export const {
    setMyJobs,
    setMyJobsLoadError,
    removeMyJob,
    setCurrentJob,
    setJobApplicants,
    setJobApplicantsLoadError,
    setJobAnalytics,
    setJobAnalyticsLoadError,
    setRecruiterOverview,
    setRecruiterOverviewLoadError,
    patchJobApplicant,
    patchJobApplicantShortlist,
    patchJobApplicantNotes,
    patchJobApplicantsBulk,
    setPublicJobs,
    setCurrentPublicJob,
    setMyApplications,
    setMyApplicationsLoadError,
    setSavedJobs,
    patchSavedJobId,
    setLoading,
    setMyApplicationsLoading,
    setSavedJobsLoading,
} = jobSlice.actions
export default jobSlice.reducer
