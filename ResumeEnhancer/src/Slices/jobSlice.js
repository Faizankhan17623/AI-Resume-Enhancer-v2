import { createSlice } from "@reduxjs/toolkit";

// deliberately separate from jobSearchSlice.js sir — that's the unrelated private Tavily
// web-search feature, this is the real recruiter-posted job board + applications state
const initialState = {
    // recruiter-side sir
    myJobs: [],
    currentJob: null,
    jobApplicants: [],
    // whether the CURRENT job (whichever one jobApplicants is for) has a proctored test attached
    // sir — tests are optional now, this drives whether "Invite to test" even shows
    jobHasTest: false,
    // whether that attached test has actually been PUBLISHED sir — a test can be attached but
    // still sitting in draft (no inviteCode yet), in which case invite must be blocked with an
    // explanation rather than silently flipping status and sending no email
    testPublished: false,
    jobAnalytics: null,
    recruiterOverview: null,

    // public board sir
    publicJobs: [],
    publicJobsPagination: { page: 1, limit: 20, total: 0, pages: 1 },
    currentPublicJob: null,

    // candidate-side sir
    myApplications: [],
    // just the ids sir — cheap to carry on every board/detail page for an instant "is this saved"
    // check, without needing the full populated job on pages that don't show the Saved Jobs list
    savedJobIds: [],
    savedJobs: [],

    loading: false,
};

const jobSlice = createSlice({
    name: "job",
    initialState: initialState,
    reducers: {
        setMyJobs(state, value) {
            state.myJobs = value.payload
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
        setJobAnalytics(state, value) {
            state.jobAnalytics = value.payload
        },
        setRecruiterOverview(state, value) {
            state.recruiterOverview = value.payload
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
    }
})

export const {
    setMyJobs,
    removeMyJob,
    setCurrentJob,
    setJobApplicants,
    setJobAnalytics,
    setRecruiterOverview,
    patchJobApplicant,
    patchJobApplicantShortlist,
    patchJobApplicantNotes,
    patchJobApplicantsBulk,
    setPublicJobs,
    setCurrentPublicJob,
    setMyApplications,
    setSavedJobs,
    patchSavedJobId,
    setLoading,
} = jobSlice.actions
export default jobSlice.reducer
