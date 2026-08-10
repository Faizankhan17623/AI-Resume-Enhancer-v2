import { createSlice } from "@reduxjs/toolkit";

// candidate-side live attempt state sir — the test definition (sanitized, no correctAnswer),
// the attempt document, and the running violation count used by ProctoredTestRunner to decide
// when to show a warning vs. end the test
const initialState = {
    test: null,           // { title, description, questions, maxViolations }
    attempt: null,         // { _id, status, endsAt, violationCount, ... }
    answers: {},           // questionId -> answer, kept locally until submit
    cameraConsent: false,
    loading: false,
};

const testAttemptSlice = createSlice({
    name: "testAttempt",
    initialState: initialState,
    reducers: {
        setTestAndAttempt(state, value) {
            state.test = value.payload.test
            state.attempt = value.payload.attempt
        },
        setAnswer(state, value) {
            state.answers[value.payload.questionId] = value.payload.answer
        },
        setCameraConsent(state, value) {
            state.cameraConsent = value.payload
        },
        setViolationState(state, value) {
            // merges { violationCount, status } from a logViolation response sir
            if (!state.attempt) return
            state.attempt.violationCount = value.payload.violationCount
            state.attempt.status = value.payload.status
        },
        setAttemptStatus(state, value) {
            if (!state.attempt) return
            state.attempt.status = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        resetTestAttempt() {
            return initialState
        },
    }
})

export const {
    setTestAndAttempt,
    setAnswer,
    setCameraConsent,
    setViolationState,
    setAttemptStatus,
    setLoading,
    resetTestAttempt,
} = testAttemptSlice.actions
export default testAttemptSlice.reducer
