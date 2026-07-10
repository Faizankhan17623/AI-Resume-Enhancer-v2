import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import {
    setStats, setCharts, setUsers, setUsersPagination, setPayments,
    setAuditLogs, setAnnouncements, setAiStats, setHealth, setLoading
} from '../../Slices/adminSlice.js'
import { AdminStats, AdminUsers, AdminPayments, AdminAnnouncements } from '../Apis/AdminApi.js'

const { dashboardstats, aistats, health, auditlogs } = AdminStats
const { allusers, updaterole, updateplan, banuser, adjustcredits, deleteuser } = AdminUsers
const { allpayments } = AdminPayments
const { createannouncement, allannouncements, toggleannouncement, deleteannouncement } = AdminAnnouncements

// ---------- overview sir ----------

export function GetDashboardStats(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", dashboardstats, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setStats(response.data.stats))
            dispatch(setCharts(response.data.charts))
        } catch (error) {
            console.error("Error fetching the admin stats", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetAiStats(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", aistats, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAiStats(response.data))
        } catch (error) {
            console.error("Error fetching the AI stats", error)
        }
    }
}

export function GetHealth(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", health, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setHealth(response.data.health))
        } catch (error) {
            console.error("Error fetching the health", error)
        }
    }
}

// ---------- user management sir ----------

export function GetUsers(token, page = 1, search = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", allusers, null, {
                Authorization: `Bearer ${token}`
            }, { page, limit: 20, search })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setUsers(response.data.users))
            dispatch(setUsersPagination(response.data.pagination))
        } catch (error) {
            console.error("Error fetching the users", error)
            toast.error(error?.response?.data?.message || "Could not load the users")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// one shared helper sir — every user action follows the same toast → call → refresh pattern
const userAction = (method, url, body, token, page, search, loadingText) => {
    return async (dispatch) => {
        const toastId = toast.loading(loadingText)
        try {
            const response = await apiConnector(method, url, body, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetUsers(token, page, search))
        } catch (error) {
            console.error("Admin user action failed", error)
            toast.error(error?.response?.data?.message || "The action failed")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export const UpdateUserRole = (userId, role, token, page, search) =>
    userAction("PATCH", `${updaterole}/${userId}/role`, { role }, token, page, search, "Updating the role...")

export const UpdateUserPlan = (userId, plan, token, page, search) =>
    userAction("PATCH", `${updateplan}/${userId}/plan`, { plan }, token, page, search, "Updating the plan...")

export const AdjustCredits = (userId, delta, token, page, search) =>
    userAction("PATCH", `${adjustcredits}/${userId}/credits`, { delta }, token, page, search, "Adjusting the credits...")

export const BanUser = (userId, banned, reason, token, page, search) =>
    userAction("PATCH", `${banuser}/${userId}/ban`, { banned, reason }, token, page, search, banned ? "Suspending the account..." : "Restoring the account...")

export const DeleteUser = (userId, token, page, search) =>
    userAction("DELETE", `${deleteuser}/${userId}`, null, token, page, search, "Deleting the user...")

// ---------- money sir ----------

export function GetPayments(token, page = 1, status = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", allpayments, null, {
                Authorization: `Bearer ${token}`
            }, { page, limit: 20, ...(status && { status }) })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setPayments(response.data))
        } catch (error) {
            console.error("Error fetching the payments", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// ---------- audit trail sir ----------

export function GetAuditLogs(token, page = 1) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", auditlogs, null, {
                Authorization: `Bearer ${token}`
            }, { page, limit: 50 })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAuditLogs(response.data.logs))
        } catch (error) {
            console.error("Error fetching the audit logs", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// ---------- announcements sir ----------

export function GetAnnouncements(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", allannouncements, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAnnouncements(response.data.announcements))
        } catch (error) {
            console.error("Error fetching the announcements", error)
        }
    }
}

export function CreateAnnouncement(title, message, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Publishing...")
        try {
            const response = await apiConnector("POST", createannouncement, { title, message }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Announcement is live")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            console.error("Error creating the announcement", error)
            toast.error(error?.response?.data?.message || "Could not publish")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function ToggleAnnouncement(announcementId, active, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${toggleannouncement}/${announcementId}`, { active }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetAnnouncements(token))
        } catch (error) {
            console.error("Error toggling the announcement", error)
            toast.error(error?.response?.data?.message || "Could not update")
        }
    }
}

export function DeleteAnnouncement(announcementId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${deleteannouncement}/${announcementId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Announcement deleted")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            console.error("Error deleting the announcement", error)
            toast.error(error?.response?.data?.message || "Could not delete")
        }
    }
}
