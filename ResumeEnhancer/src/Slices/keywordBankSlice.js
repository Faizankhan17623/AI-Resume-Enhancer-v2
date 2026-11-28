import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // every keyword the AI has ever flagged across this user's reviews sir
    items: [],
    summary: null,
    loading: false,
    // a failed fetch used to leave `items` at its empty initial value with no signal sir
    loadError: false,
};

const keywordBankSlice = createSlice({
    name: "keywordBank",
    initialState: initialState,
    reducers: {
        setItems(state, value) {
            state.items = value.payload
        },
        setSummary(state, value) {
            state.summary = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setLoadError(state, value) {
            state.loadError = value.payload
        }
    }
})

export const { setItems, setSummary, setLoading, setLoadError } = keywordBankSlice.actions
export default keywordBankSlice.reducer
