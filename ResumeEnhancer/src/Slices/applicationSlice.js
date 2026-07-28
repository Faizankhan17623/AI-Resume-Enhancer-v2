import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the application tracker board sir — one flat list, grouped by status in the UI
    applications: [],
    loading: false,
    saving: false,
    // outcome-linked analytics sir — score bucket -> interview rate, Pro Max only
    analytics: null,
    analyticsLoading: false,
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
        }
    }
})

export const { setApplications, setLoading, setSaving, setAnalytics, setAnalyticsLoading } = applicationSlice.actions
export default applicationSlice.reducer
