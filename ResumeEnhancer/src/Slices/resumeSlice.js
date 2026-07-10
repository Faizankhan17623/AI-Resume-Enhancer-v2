import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the saved resume library sir
    resumes: [],
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
        setLoading(state, value) {
            state.loading = value.payload
        },
        setSaving(state, value) {
            state.saving = value.payload
        }
    }
})

export const { setResumes, setLoading, setSaving } = resumeSlice.actions
export default resumeSlice.reducer
