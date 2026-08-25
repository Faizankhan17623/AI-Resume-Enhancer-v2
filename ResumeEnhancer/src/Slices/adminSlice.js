import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the /admin/stats payload sir — headline numbers + the 30-day charts
    stats: null,
    charts: null,
    // user management
    users: [],
    usersPagination: null,
    userDetail: null,
    userDetailLoading: false,
    // money, audit trail, announcements, ai monitor, health
    payments: null,
    auditLogs: [],
    auditLogsPagination: null,
    announcements: [],
    aiStats: null,
    aiUsageByUser: null,
    health: null,
    deletions: null,
    reconciliation: null,
    security: null,
    atRisk: null,
    referralAbuse: null,
    traffic: null,
    trafficRange: 'week',
    settings: [],
    testimonials: [],
    reports: [],
    recruiterApplications: [],
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
        setUserDetail(state, value) {
            state.userDetail = value.payload
        },
        setUserDetailLoading(state, value) {
            state.userDetailLoading = value.payload
        },
        setPayments(state, value) {
            state.payments = value.payload
        },
        setAuditLogs(state, value) {
            state.auditLogs = value.payload
        },
        setAuditLogsPagination(state, value) {
            state.auditLogsPagination = value.payload
        },
        setAnnouncements(state, value) {
            state.announcements = value.payload
        },
        setAiStats(state, value) {
            state.aiStats = value.payload
        },
        setAiUsageByUser(state, value) {
            state.aiUsageByUser = value.payload
        },
        setHealth(state, value) {
            state.health = value.payload
        },
        setDeletions(state, value) {
            state.deletions = value.payload
        },
        setReconciliation(state, value) {
            state.reconciliation = value.payload
        },
        setSecurity(state, value) {
            state.security = value.payload
        },
        setAtRisk(state, value) {
            state.atRisk = value.payload
        },
        setReferralAbuse(state, value) {
            state.referralAbuse = value.payload
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
        setTestimonials(state, value) {
            state.testimonials = value.payload
        },
        setReports(state, value) {
            state.reports = value.payload
        },
        setRecruiterApplications(state, value) {
            state.recruiterApplications = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const {
    setStats, setCharts, setUsers, setUsersPagination, setUserDetail, setUserDetailLoading, setPayments,
    setAuditLogs, setAuditLogsPagination, setAnnouncements, setAiStats, setAiUsageByUser, setHealth, setDeletions, setReconciliation, setSecurity, setAtRisk, setReferralAbuse, setTraffic, setTrafficRange, setSettings, setTestimonials, setReports, setRecruiterApplications, setLoading
} = adminSlice.actions
export default adminSlice.reducer
