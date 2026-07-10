import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the letter currently shown sir
    content: null,
    letterId: null,
    // saved list for the history view sir
    allLetters: [],
    loading: false,
    generating: false,
};

const coverLetterSlice = createSlice({
    name: "coverLetter",
    initialState: initialState,
    reducers: {
        setContent(state, value) {
            state.content = value.payload
        },
        setLetterId(state, value) {
            state.letterId = value.payload
        },
        setAllLetters(state, value) {
            state.allLetters = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setGenerating(state, value) {
            state.generating = value.payload
        }
    }
})

export const {
    setContent, setLetterId, setAllLetters, setLoading, setGenerating
} = coverLetterSlice.actions
export default coverLetterSlice.reducer
