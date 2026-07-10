import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the three plans from the backend sir — single source of truth is utils/Plans.js there
    plans: [],
    history: [],
    loading: false
};

const paymentSlice = createSlice({
    name: "payment",
    initialState: initialState,
    reducers: {
        setPlans(state, value) {
            state.plans = value.payload
        },
        setHistory(state, value) {
            state.history = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setPlans, setHistory, setLoading } = paymentSlice.actions
export default paymentSlice.reducer
