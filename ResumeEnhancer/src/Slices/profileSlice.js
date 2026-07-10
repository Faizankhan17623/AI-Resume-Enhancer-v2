import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the full account-page payload from GET /profile sir — user + plan + activity
    profile: null,
    loading: false
};

const profileSlice = createSlice({
    name: "profile",
    initialState: initialState,
    reducers: {
        setProfile(state, value) {
            state.profile = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setNotificationPrefs(state, value) {
            if (state.profile?.user) {
                Object.assign(state.profile.user, value.payload)
            }
        }
    }
})

export const { setProfile, setLoading, setNotificationPrefs } = profileSlice.actions
export default profileSlice.reducer
