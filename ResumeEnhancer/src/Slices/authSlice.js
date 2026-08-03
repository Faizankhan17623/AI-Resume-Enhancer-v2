import { createSlice } from "@reduxjs/toolkit";

// The auth TOKEN is deliberately NOT persisted sir. It used to live in localStorage, which meant
// the httpOnly cookie the backend sets was pointless security theatre: any XSS anywhere on the
// page could read the token straight out of localStorage and use it for its full 7-day life.
// The httpOnly cookie (see Backend/utils/session.js) is now the real credential and JS cannot
// read it; the token here exists only in memory, for the lifetime of the tab, as an
// Authorization-header fallback for browsers that block third-party cookies.
//
// The `user` object IS still cached, because it is non-sensitive display data (name, role,
// plan) and reading it synchronously avoids a blank dashboard flash on reload. It is treated
// strictly as a UI hint, never as proof of anything — every protected route revalidates against
// the server, and the backend re-reads role from the database on every single request.
const cachedUser = () => {
    try {
        const raw = localStorage.getItem("user")
        return raw ? JSON.parse(raw) : null
    } catch {
        // corrupt/partial JSON must not white-screen the whole app on boot sir
        localStorage.removeItem("user")
        return null
    }
}

const initialState = {
    user: cachedUser(),
    token: null,
    // optimistic sir — a cached user means "probably signed in, try it". The session cookie is
    // what actually decides, and a 401 from any call clears this via the axios interceptor.
    isLoggedIn: !!cachedUser(),
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
