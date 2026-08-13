import { createSlice } from "@reduxjs/toolkit";

// deliberately separate from jobSearchSlice.js sir — that's the unrelated private Tavily
// web-search feature, this is the real recruiter-posted job board + applications state
const initialState = {
    // recruiter-side sir
    myJobs: [],
    currentJob: null,
    jobApplicants: [],
    jobAnalytics: null,

    // public board sir
    publicJobs: [],
    publicJobsPagination: { page: 1, limit: 20, total: 0, pages: 1 },
    currentPublicJob: null,

    // candidate-side sir
    myApplications: [],

    loading: false,
};

const jobSlice = createSlice({
    name: "job",
    initialState: initialState,
    reducers: {
        setMyJobs(state, value) {
            state.myJobs = value.payload
        },
        setCurrentJob(state, value) {
            state.currentJob = value.payload
        },
        setJobApplicants(state, value) {
            state.jobApplicants = value.payload
        },
        setJobAnalytics(state, value) {
            state.jobAnalytics = value.payload
        },
        // Hire/Reject updates the one row in place sir — same pattern as an optimistic-ish
        // local patch after a successful PATCH, no full refetch needed
        patchJobApplicant(state, value) {
            const { applicationId, status } = value.payload
            const app = state.jobApplicants.find((a) => a._id === applicationId)
            if (app) app.status = status
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
        setLoading(state, value) {
            state.loading = value.payload
        },
    }
})

export const {
    setMyJobs,
    setCurrentJob,
    setJobApplicants,
    setJobAnalytics,
    patchJobApplicant,
    setPublicJobs,
    setCurrentPublicJob,
    setMyApplications,
    setLoading,
} = jobSlice.actions
export default jobSlice.reducer
