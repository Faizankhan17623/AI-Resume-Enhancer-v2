const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const AdminStats = {
    dashboardstats: BASE_URL + "/admin/stats",
    aistats: BASE_URL + "/admin/ai",
    health: BASE_URL + "/admin/health",
    insights: BASE_URL + "/admin/insights",
    auditlogs: BASE_URL + "/admin/audit"
}

export const AdminUsers = {
    allusers: BASE_URL + "/admin/users",
    userdetail: BASE_URL + "/admin/users",        // + /:userId
    updaterole: BASE_URL + "/admin/users",        // + /:userId/role
    updateplan: BASE_URL + "/admin/users",        // + /:userId/plan
    banuser: BASE_URL + "/admin/users",           // + /:userId/ban
    adjustcredits: BASE_URL + "/admin/users",     // + /:userId/credits
    impersonate: BASE_URL + "/admin/users",       // + /:userId/impersonate
    deleteuser: BASE_URL + "/admin/users"         // + /:userId
}

export const AdminPayments = {
    allpayments: BASE_URL + "/admin/payments"
}

export const AdminAnnouncements = {
    createannouncement: BASE_URL + "/admin/announcements",
    allannouncements: BASE_URL + "/admin/announcements",
    toggleannouncement: BASE_URL + "/admin/announcements",   // + /:announcementId
    deleteannouncement: BASE_URL + "/admin/announcements"    // + /:announcementId
}
