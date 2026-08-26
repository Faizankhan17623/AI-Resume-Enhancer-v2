import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import {
    setStats, setCharts, setUsers, setUsersPagination, setUserDetail, setUserDetailLoading, setPayments,
    setAuditLogs, setAuditLogsPagination, setAnnouncements, setAiStats, setAiUsageByUser, setHealth, setDeletions, setReconciliation, setSecurity, setAtRisk, setReferralAbuse, setTraffic, setSettings, setTestimonials, setReports, setRecruiterApplications, setLoading
} from '../../Slices/adminSlice.js'
import { AdminStats, AdminUsers, AdminPayments, AdminAnnouncements, AdminSettings, AdminTestimonials, AdminReports, AdminRecruiterApplications } from '../Apis/AdminApi.js'

const { dashboardstats, aistats, aiUsageByUser: aiUsageByUserUrl, health, auditlogs, creditgrants, traffic, deletions, reconciliation, security, atrisk, referralabuse, search: searchUrl } = AdminStats
const { allusers, userdetail, updaterole, bulkupdaterole, updateplan, banuser, bulkbanusers, adjustcredits, grantcreditsall, deleteuser } = AdminUsers
const { allpayments } = AdminPayments
const { createannouncement, allannouncements, toggleannouncement, deleteannouncement } = AdminAnnouncements
const { getsettings, updatesetting } = AdminSettings
const { alltestimonials, moderatetestimonial, deletetestimonial } = AdminTestimonials
const { allreports, updatereport, deletereport } = AdminReports
const { list: recruiterApplicationsUrl, approve: approveRecruiterUrl, reject: rejectRecruiterUrl } = AdminRecruiterApplications

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
            logApiError("Error fetching the admin stats", error)
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
            logApiError("Error fetching the AI stats", error)
        }
    }
}

// per-user token consumption, 30-day window sir — deliberately TOKEN volume, not a dollar
// figure, since this app runs on Groq's free tier right now (see AiModel.js/AdminSystem.js)
export function GetAiUsageByUser(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", aiUsageByUserUrl, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAiUsageByUser(response.data.usage))
        } catch (error) {
            logApiError("Error fetching per-user AI usage", error)
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
            logApiError("Error fetching the health", error)
        }
    }
}

export function GetDeletions(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", deletions, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setDeletions(response.data.deletions))
        } catch (error) {
            logApiError("Error fetching the deletion stats", error)
        }
    }
}

export function GetReconciliation(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", reconciliation, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setReconciliation(response.data.reconciliation))
        } catch (error) {
            logApiError("Error fetching the reconciliation stats", error)
        }
    }
}

export function GetSecurity(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", security, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSecurity(response.data.security))
        } catch (error) {
            logApiError("Error fetching the security stats", error)
        }
    }
}

// paying subscribers gone quiet 7+ days sir — same inactivity signal StreakCron.js's
// sendWinBackNudges already emails on, just finally visible to an admin
export function GetAtRisk(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", atrisk, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAtRisk(response.data.atRisk))
        } catch (error) {
            logApiError("Error fetching at-risk users", error)
        }
    }
}

// referrers near the payout cap, whose invitees got banned afterward, or paying out unusually
// fast sir — see controllers/AdminSystem.js's getReferralAbuseSignals for what each list means
export function GetReferralAbuse(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", referralabuse, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setReferralAbuse(response.data.referralAbuse))
        } catch (error) {
            logApiError("Error fetching referral abuse signals", error)
        }
    }
}

export function GetTraffic(token, range = 'week') {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", traffic, null, {
                Authorization: `Bearer ${token}`
            }, { range })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setTraffic(response.data))
        } catch (error) {
            logApiError("Error fetching the traffic stats", error)
        }
    }
}

// ---------- user management sir ----------

export function GetUsers(token, page = 1, search = "", role = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", allusers, null, {
                Authorization: `Bearer ${token}`
            }, { page, limit: 20, search, role })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setUsers(response.data.users))
            dispatch(setUsersPagination(response.data.pagination))
        } catch (error) {
            logApiError("Error fetching the users", error)
            toast.error(error?.response?.data?.message || "Could not load the users")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// one user's full profile + activity summary sir — powers the detail drawer on the Users page
export function GetUserDetail(userId, token) {
    return async (dispatch) => {
        dispatch(setUserDetailLoading(true))
        dispatch(setUserDetail(null))
        try {
            const response = await apiConnector("GET", `${userdetail}/${userId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setUserDetail({ user: response.data.user, activity: response.data.activity }))
        } catch (error) {
            logApiError("Error fetching the user detail", error)
            toast.error(error?.response?.data?.message || "Could not load this user's detail")
        } finally {
            dispatch(setUserDetailLoading(false))
        }
    }
}

// one shared helper sir — every user action follows the same toast → call → refresh pattern
const userAction = (method, url, body, token, page, search, loadingText, roleFilter = "") => {
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
            dispatch(GetUsers(token, page, search, roleFilter))
        } catch (error) {
            logApiError("Admin user action failed", error)
            toast.error(error?.response?.data?.message || "The action failed")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export const UpdateUserRole = (userId, role, token, page, search, roleFilter) =>
    userAction("PATCH", `${updaterole}/${userId}/role`, { role }, token, page, search, "Updating the role...", roleFilter)

export const UpdateUserPlan = (userId, plan, token, page, search, roleFilter) =>
    userAction("PATCH", `${updateplan}/${userId}/plan`, { plan }, token, page, search, "Updating the plan...", roleFilter)

export const AdjustCredits = (userId, credits, reason, token, page, search, roleFilter) =>
    userAction("PATCH", `${adjustcredits}/${userId}/credits`, { credits, ...(reason ? { reason } : {}) }, token, page, search, "Granting bonus credits...", roleFilter)

// broadcast bonus sir — not a userAction() call like the others: it doesn't target a single row,
// so there's no page/search/roleFilter to refetch against automatically. Caller (Users.jsx)
// dispatches this directly, shows its own full-screen loader while this is in flight, and
// refetches its own list afterward — no toast.loading here, the caller's loader already covers it.
export const GrantCreditsToAll = (credits, reason, token) => async (dispatch) => {
    try {
        const response = await apiConnector("POST", grantcreditsall, { credits, ...(reason ? { reason } : {}) }, {
            Authorization: `Bearer ${token}`
        })

        if (!response.data.success) {
            throw new Error(response.data.message)
        }

        dispatch(GetUsers(token, 1, '', ''))
        return response.data.message
    } catch (error) {
        logApiError("Grant credits to all failed", error)
        toast.error(error?.response?.data?.message || "The bulk grant failed")
        return null
    }
}

export const BanUser = (userId, banned, reason, token, page, search, roleFilter) =>
    userAction("PATCH", `${banuser}/${userId}/ban`, { banned, reason }, token, page, search, banned ? "Suspending the account..." : "Restoring the account...", roleFilter)

// marks a Support account's one appeal reviewed/rejected sir — the account STAYS suspended,
// this just closes out the appeal (see Backend/controllers/Admin.js's rejectSupportAppeal) and
// fires the "this is final" email to the account holder
export const RejectSupportAppeal = (userId, token, page, search, roleFilter) =>
    userAction("PATCH", `${banuser}/${userId}/reject-appeal`, {}, token, page, search, "Rejecting the appeal...", roleFilter)

export const BulkBanUsers = (userIds, banned, reason, token, page, search, roleFilter) =>
    userAction("PATCH", bulkbanusers, { userIds, banned, reason }, token, page, search, banned ? "Suspending accounts..." : "Restoring accounts...", roleFilter)

export const BulkUpdateUserRole = (userIds, role, token, page, search, roleFilter) =>
    userAction("PATCH", bulkupdaterole, { userIds, role }, token, page, search, `Moving accounts to ${role}...`, roleFilter)

export const DeleteUser = (userId, token, page, search, roleFilter) =>
    userAction("DELETE", `${deleteuser}/${userId}`, null, token, page, search, "Deleting the user...", roleFilter)

// plain async call sir, not a thunk — the search bar owns its own result/loading state
// locally rather than parking transient dropdown results in the shared admin slice
export async function GlobalSearch(q, token) {
    const response = await apiConnector("GET", searchUrl, null, {
        Authorization: `Bearer ${token}`
    }, { q })

    if (!response.data.success) {
        throw new Error(response.data.message)
    }

    return { users: response.data.users, payments: response.data.payments }
}

// where every bonus credit came from sir — two independently-paginated sections (admin grants,
// referral rewards), not a Redux thunk like GetAuditLogs since the page owns both page numbers
// itself and refetches directly, same pattern as GlobalSearch above
export async function GetCreditGrants(token, { adminPage = 1, referralPage = 1, search = "" } = {}) {
    const response = await apiConnector("GET", creditgrants, null, {
        Authorization: `Bearer ${token}`
    }, { adminPage, referralPage, search })

    if (!response.data.success) {
        throw new Error(response.data.message)
    }

    return { admin: response.data.admin, referral: response.data.referral }
}

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
            logApiError("Error fetching the payments", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// ---------- audit trail sir ----------

export function GetAuditLogs(token, page = 1, action = "", search = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", auditlogs, null, {
                Authorization: `Bearer ${token}`
            }, { page, limit: 20, action, search })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAuditLogs(response.data.logs))
            dispatch(setAuditLogsPagination(response.data.pagination))
        } catch (error) {
            logApiError("Error fetching the audit logs", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// fetches every log matching the current filter sir (capped server-side), not just the
// visible page — used only by the CSV export button, doesn't touch the paginated Redux state
export async function FetchAllAuditLogsForExport(token, action = "", search = "") {
    const response = await apiConnector("GET", auditlogs, null, {
        Authorization: `Bearer ${token}`
    }, { export: true, action, search })

    if (!response.data.success) {
        throw new Error(response.data.message)
    }

    return response.data
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
            logApiError("Error fetching the announcements", error)
        }
    }
}

// `onLoadingChange` sir — replaces the old toast.loading("Publishing...") with the real spinner
// (Components/extra/Loading.jsx), same as every other Admin page. Success/error still toast,
// same as the rest of Admin — this only changes the IN-FLIGHT indicator.
export function CreateAnnouncement(title, message, token, options = {}, onLoadingChange) {
    const { active, startsAt, expiresAt } = options
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", createannouncement, { title, message, active, startsAt, expiresAt }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message || "Announcement published")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            logApiError("Error creating the announcement", error)
            toast.error(error?.response?.data?.message || "Could not publish")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function UpdateAnnouncement(announcementId, payload, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("PATCH", `${toggleannouncement}/${announcementId}`, payload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message || "Announcement updated")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            logApiError("Error updating the announcement", error)
            toast.error(error?.response?.data?.message || "Could not update")
        } finally {
            onLoadingChange?.(false)
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
            logApiError("Error toggling the announcement", error)
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
            logApiError("Error deleting the announcement", error)
            toast.error(error?.response?.data?.message || "Could not delete")
        }
    }
}

// ---------- feature flags sir ----------

export function GetSettings(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", getsettings, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSettings(response.data.settings))
        } catch (error) {
            logApiError("Error fetching the settings", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// `onLoadingChange` sir — shows the real spinner (Components/extra/Loading.jsx) while a toggle
// or note save is in flight, same pattern as CreateAnnouncement/UpdateAnnouncement above.
// Success/error still toast.
export function UpdateSetting(key, enabled, note, token, disabledUntil, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("PATCH", `${updatesetting}/${key}`, { enabled, note, disabledUntil }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetSettings(token))
        } catch (error) {
            logApiError("Error updating the setting", error)
            toast.error(error?.response?.data?.message || "Could not update the setting")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// ---------- testimonials sir ----------

export function GetTestimonials(token, status = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", alltestimonials, null, {
                Authorization: `Bearer ${token}`
            }, status ? { status } : {})

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setTestimonials(response.data.testimonials))
        } catch (error) {
            logApiError("Error fetching the testimonials", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function ModerateTestimonial(testimonialId, status, token) {
    return async (dispatch) => {
        const toastId = toast.loading(status === 'approved' ? 'Approving...' : 'Rejecting...')
        try {
            const response = await apiConnector("PATCH", `${moderatetestimonial}/${testimonialId}`, { status }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetTestimonials(token))
        } catch (error) {
            logApiError("Error moderating the testimonial", error)
            toast.error(error?.response?.data?.message || "Could not update")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function DeleteTestimonial(testimonialId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${deletetestimonial}/${testimonialId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Testimonial deleted")
            dispatch(GetTestimonials(token))
        } catch (error) {
            logApiError("Error deleting the testimonial", error)
            toast.error(error?.response?.data?.message || "Could not delete")
        }
    }
}

// ---------- bug reports & feature suggestions sir ----------

export function GetReports(token, type = "", status = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const params = {}
            if (type) params.type = type
            if (status) params.status = status

            const response = await apiConnector("GET", allreports, null, {
                Authorization: `Bearer ${token}`
            }, params)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setReports(response.data.reports))
        } catch (error) {
            logApiError("Error fetching the reports", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function UpdateReportStatus(reportId, status, token, type = "", statusFilter = "") {
    return async (dispatch) => {
        const toastId = toast.loading('Updating...')
        try {
            const response = await apiConnector("PATCH", `${updatereport}/${reportId}`, { status }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetReports(token, type, statusFilter))
        } catch (error) {
            logApiError("Error updating the report", error)
            toast.error(error?.response?.data?.message || "Could not update")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function DeleteReport(reportId, token, type = "", statusFilter = "") {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${deletereport}/${reportId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Report deleted")
            dispatch(GetReports(token, type, statusFilter))
        } catch (error) {
            logApiError("Error deleting the report", error)
            toast.error(error?.response?.data?.message || "Could not delete")
        }
    }
}

// ---------- recruiter self-signup approval queue sir ----------

export function GetRecruiterApplications(token, status = "pending") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", recruiterApplicationsUrl, null, {
                Authorization: `Bearer ${token}`
            }, { status })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setRecruiterApplications(response.data.applicants))
        } catch (error) {
            logApiError("Error fetching recruiter applications", error)
            toast.error(error?.response?.data?.message || "Could not load recruiter applications")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function ApproveRecruiterApplication(userId, token, statusFilter = "pending") {
    return async (dispatch) => {
        const toastId = toast.loading("Approving...")
        try {
            const response = await apiConnector("POST", `${approveRecruiterUrl}/${userId}/approve`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetRecruiterApplications(token, statusFilter))
        } catch (error) {
            logApiError("Error approving recruiter application", error)
            toast.error(error?.response?.data?.message || "Could not approve the application")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function RejectRecruiterApplication(userId, reason, token, statusFilter = "pending") {
    return async (dispatch) => {
        const toastId = toast.loading("Rejecting...")
        try {
            const response = await apiConnector("POST", `${rejectRecruiterUrl}/${userId}/reject`, { reason }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetRecruiterApplications(token, statusFilter))
        } catch (error) {
            logApiError("Error rejecting recruiter application", error)
            toast.error(error?.response?.data?.message || "Could not reject the application")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
