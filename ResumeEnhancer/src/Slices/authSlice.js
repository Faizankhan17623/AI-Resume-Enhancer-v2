import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null,
    token: localStorage.getItem("token") ? JSON.parse(localStorage.getItem("token")) : null,
    isLoggedIn: localStorage.getItem("token") ? true : false,
    loading: false,
    // the email waiting on the OTP screen sir
    signupData: null
};

const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        setUser(state, value) {
            state.user = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setToken(state, value) {
            state.token = value.payload
        },
        setLogin(state, value) {
            state.isLoggedIn = value.payload
        },
        setSignupData(state, value) {
            state.signupData = value.payload
        }
    }
})

export const { setUser, setLoading, setToken, setLogin, setSignupData } = authSlice.actions
export default authSlice.reducer
