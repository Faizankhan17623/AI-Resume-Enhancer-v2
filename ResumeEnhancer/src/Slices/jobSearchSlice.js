import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    jobs: [],
    lastQuery: '',
    searching: false,
};

const jobSearchSlice = createSlice({
    name: "jobSearch",
    initialState: initialState,
    reducers: {
        setJobs(state, value) {
            state.jobs = value.payload
        },
        setLastQuery(state, value) {
            state.lastQuery = value.payload
        },
        setSearching(state, value) {
            state.searching = value.payload
        }
    }
})

export const { setJobs, setLastQuery, setSearching } = jobSearchSlice.actions
export default jobSearchSlice.reducer
