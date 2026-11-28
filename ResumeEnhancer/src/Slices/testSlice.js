import { createSlice } from "@reduxjs/toolkit";

// recruiter-side state sir — the list of tests they own, the currently open test/attempt list,
// and one attempt's full detail (violation timeline)
const initialState = {
    myTests: [],
    currentTest: null,
    testAttempts: [],
    currentAttemptDetail: null,
    // a failed fetch used to leave `currentAttemptDetail` null forever, which AttemptDetail.jsx's
    // own `loading || !attempt` guard rendered as an endless loading spinner instead of an error
    attemptDetailLoadError: false,
    loading: false,
};

const testSlice = createSlice({
    name: "test",
    initialState: initialState,
    reducers: {
        setMyTests(state, value) {
            state.myTests = value.payload
        },
        setCurrentTest(state, value) {
            state.currentTest = value.payload
        },
        setTestAttempts(state, value) {
            state.testAttempts = value.payload
        },
        setCurrentAttemptDetail(state, value) {
            state.currentAttemptDetail = value.payload
        },
        setAttemptDetailLoadError(state, value) {
            state.attemptDetailLoadError = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
    }
})

export const { setMyTests, setCurrentTest, setTestAttempts, setCurrentAttemptDetail, setAttemptDetailLoadError, setLoading } = testSlice.actions
export default testSlice.reducer
