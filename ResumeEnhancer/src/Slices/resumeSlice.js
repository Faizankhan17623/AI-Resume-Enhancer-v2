import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the saved resume library sir
    resumes: [],
    // a failed fetch used to leave `resumes` at its empty initial value with no signal sir
    loadError: false,
    loading: false,
    saving: false,
};

const resumeSlice = createSlice({
    name: "resume",
    initialState: initialState,
    reducers: {
        setResumes(state, value) {
            state.resumes = value.payload
        },
        setLoadError(state, value) {
            state.loadError = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setSaving(state, value) {
            state.saving = value.payload
        }
    }
})

export const { setResumes, setLoadError, setLoading, setSaving } = resumeSlice.actions
export default resumeSlice.reducer
