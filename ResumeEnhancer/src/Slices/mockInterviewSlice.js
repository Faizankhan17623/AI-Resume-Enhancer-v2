import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the sidebar list sir
    allSessions: [],
    // the open session with its turns
    currentSession: null,
    loading: false,
    // true while the AI is scoring the answer / preparing the next question sir
    scoring: false,
};

const mockInterviewSlice = createSlice({
    name: "mockInterview",
    initialState: initialState,
    reducers: {
        setAllSessions(state, value) {
            state.allSessions = value.payload
        },
        setCurrentSession(state, value) {
            state.currentSession = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setScoring(state, value) {
            state.scoring = value.payload
        },
    }
})

export const { setAllSessions, setCurrentSession, setLoading, setScoring } = mockInterviewSlice.actions
export default mockInterviewSlice.reducer
