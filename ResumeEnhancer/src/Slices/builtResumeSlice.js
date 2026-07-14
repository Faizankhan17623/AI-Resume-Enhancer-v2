import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the builder list sir — lightweight (title/templateId/dates only, see backend select())
    resumes: [],
    // the one currently open in the editor sir — full structured data
    current: null,
    loading: false,
    saving: false,
    generating: false,
};

const builtResumeSlice = createSlice({
    name: "builtResume",
    initialState: initialState,
    reducers: {
        setBuiltResumes(state, value) {
            state.resumes = value.payload
        },
        setCurrentResume(state, value) {
            state.current = value.payload
        },
        // local, instant edits sir — the editor updates this on every keystroke, autosave persists it later
        patchCurrentResume(state, value) {
            if (state.current) {
                state.current = { ...state.current, ...value.payload }
            }
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setSaving(state, value) {
            state.saving = value.payload
        },
        setGenerating(state, value) {
            state.generating = value.payload
        },
    }
})

export const {
    setBuiltResumes,
    setCurrentResume,
    patchCurrentResume,
    setLoading,
    setSaving,
    setGenerating,
} = builtResumeSlice.actions
export default builtResumeSlice.reducer
