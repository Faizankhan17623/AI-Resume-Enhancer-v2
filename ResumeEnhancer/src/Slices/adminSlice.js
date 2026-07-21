import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the /admin/stats payload sir — headline numbers + the 30-day charts
    stats: null,
    charts: null,
    // user management
    users: [],
    usersPagination: null,
    // money, audit trail, announcements, ai monitor, health
    payments: null,
    auditLogs: [],
    announcements: [],
    aiStats: null,
    health: null,
    traffic: null,
    trafficRange: 'week',
    settings: [],
    loading: false
};

const adminSlice = createSlice({
    name: "admin",
    initialState: initialState,
    reducers: {
        setStats(state, value) {
            state.stats = value.payload
        },
        setCharts(state, value) {
            state.charts = value.payload
        },
        setUsers(state, value) {
            state.users = value.payload
        },
        setUsersPagination(state, value) {
            state.usersPagination = value.payload
        },
        setPayments(state, value) {
            state.payments = value.payload
        },
        setAuditLogs(state, value) {
            state.auditLogs = value.payload
        },
        setAnnouncements(state, value) {
            state.announcements = value.payload
        },
        setAiStats(state, value) {
            state.aiStats = value.payload
        },
        setHealth(state, value) {
            state.health = value.payload
        },
        setTraffic(state, value) {
            state.traffic = value.payload
        },
        setTrafficRange(state, value) {
            state.trafficRange = value.payload
        },
        setSettings(state, value) {
            state.settings = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const {
    setStats, setCharts, setUsers, setUsersPagination, setPayments,
    setAuditLogs, setAnnouncements, setAiStats, setHealth, setTraffic, setTrafficRange, setSettings, setLoading
} = adminSlice.actions
export default adminSlice.reducer
