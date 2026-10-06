import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the application tracker board sir — one flat list, grouped by status in the UI
    applications: [],
    loading: false,
    saving: false,
    // outcome-linked analytics sir — score bucket -> interview rate, Pro Max only
    analytics: null,
    analyticsLoading: false,
    // AI rejection diagnosis sir — which applicationId is mid-request, so only that one card
    // shows a spinner instead of the whole board
    diagnosingId: null,
    // cross-rejection pattern sir — "keyword match keeps coming up weak" style banner,
    // available to every plan (pure aggregation, no AI call, see getRejectionPatterns)
    rejectionPattern: null,
};

const applicationSlice = createSlice({
    name: "application",
    initialState: initialState,
    reducers: {
        setApplications(state, value) {
            state.applications = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setSaving(state, value) {
            state.saving = value.payload
        },
        setAnalytics(state, value) {
            state.analytics = value.payload
        },
        setAnalyticsLoading(state, value) {
            state.analyticsLoading = value.payload
        },
        setDiagnosingId(state, value) {
            state.diagnosingId = value.payload
        },
        setRejectionPattern(state, value) {
            state.rejectionPattern = value.payload
        },
        // patches one card in place sir after a successful diagnosis, instead of refetching the
        // whole board just to show one new aiDiagnosis object
        patchApplication(state, value) {
            const updated = value.payload
            const idx = state.applications.findIndex((a) => a._id === updated._id)
            if (idx !== -1) state.applications[idx] = updated
        }
    }
})

export const { setApplications, setLoading, setSaving, setAnalytics, setAnalyticsLoading, setDiagnosingId, setRejectionPattern, patchApplication } = applicationSlice.actions
export default applicationSlice.reducer
