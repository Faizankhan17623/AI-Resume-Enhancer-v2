import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the bell dropdown's list sir, newest-first, capped at 30 server-side
    notifications: [],
    unreadCount: 0,
    loading: false,
};

const notificationSlice = createSlice({
    name: "notification",
    initialState: initialState,
    reducers: {
        setNotifications(state, value) {
            state.notifications = value.payload
        },
        setUnreadCount(state, value) {
            state.unreadCount = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        // flips one notification to read locally sir, and drops the unread count by one —
        // avoids a full re-fetch just to reflect a single click
        markOneReadLocal(state, value) {
            const notification = state.notifications.find((n) => n._id === value.payload)
            if (notification && !notification.read) {
                notification.read = true
                state.unreadCount = Math.max(0, state.unreadCount - 1)
            }
        },
        markAllReadLocal(state) {
            state.notifications.forEach((n) => { n.read = true })
            state.unreadCount = 0
        }
    }
})

export const {
    setNotifications, setUnreadCount, setLoading, markOneReadLocal, markAllReadLocal
} = notificationSlice.actions
export default notificationSlice.reducer
