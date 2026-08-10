import { createSlice } from "@reduxjs/toolkit";

// recruiter-side state sir — the list of tests they own, the currently open test/attempt list,
// and one attempt's full detail (violation timeline)
const initialState = {
    myTests: [],
    currentTest: null,
    testAttempts: [],
    currentAttemptDetail: null,
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
        setLoading(state, value) {
            state.loading = value.payload
        },
    }
})

export const { setMyTests, setCurrentTest, setTestAttempts, setCurrentAttemptDetail, setLoading } = testSlice.actions
export default testSlice.reducer
