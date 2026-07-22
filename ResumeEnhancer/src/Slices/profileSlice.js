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
        },
        setOnboardingCompleted(state, value) {
            if (state.profile?.user) {
                state.profile.user.onboardingCompleted = value.payload
            }
        },
        // one merge action for every profile-edit field sir (firstName/lastName/email/number) —
        // same Object.assign pattern as setNotificationPrefs above
        setProfileUserFields(state, value) {
            if (state.profile?.user) {
                Object.assign(state.profile.user, value.payload)
            }
        }
    }
})

export const { setProfile, setLoading, setNotificationPrefs, setOnboardingCompleted, setProfileUserFields } = profileSlice.actions
export default profileSlice.reducer
