import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the application tracker board sir — one flat list, grouped by status in the UI
    applications: [],
    loading: false,
    saving: false,
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
        }
    }
})

export const { setApplications, setLoading, setSaving } = applicationSlice.actions
export default applicationSlice.reducer
