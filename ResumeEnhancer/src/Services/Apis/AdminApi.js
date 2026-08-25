import BASE_URL from '../../utils/backendUrl'

export const AdminStats = {
    dashboardstats: BASE_URL + "/admin/stats",
    aistats: BASE_URL + "/admin/ai",
    aiUsageByUser: BASE_URL + "/admin/ai/by-user",
    health: BASE_URL + "/admin/health",
    insights: BASE_URL + "/admin/insights",
    auditlogs: BASE_URL + "/admin/audit",
    creditgrants: BASE_URL + "/admin/credit-grants",
    traffic: BASE_URL + "/admin/traffic",
    deletions: BASE_URL + "/admin/deletions",
    reconciliation: BASE_URL + "/admin/reconciliation",
    security: BASE_URL + "/admin/security",
    atrisk: BASE_URL + "/admin/at-risk",
    referralabuse: BASE_URL + "/admin/referral-abuse",
    search: BASE_URL + "/admin/search"
}

export const AdminUsers = {
    allusers: BASE_URL + "/admin/users",
    userdetail: BASE_URL + "/admin/users",        // + /:userId
    updaterole: BASE_URL + "/admin/users",        // + /:userId/role
    bulkupdaterole: BASE_URL + "/admin/users/bulk-role",
    updateplan: BASE_URL + "/admin/users",        // + /:userId/plan
    banuser: BASE_URL + "/admin/users",           // + /:userId/ban
    bulkbanusers: BASE_URL + "/admin/users/bulk-ban",
    adjustcredits: BASE_URL + "/admin/users",     // + /:userId/credits
    grantcreditsall: BASE_URL + "/admin/users/grant-credits-all",
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

export const AdminSettings = {
    getsettings: BASE_URL + "/admin/settings",
    updatesetting: BASE_URL + "/admin/settings"    // + /:key
}

export const AdminTestimonials = {
    alltestimonials: BASE_URL + "/admin/testimonials",
    moderatetestimonial: BASE_URL + "/admin/testimonials",   // + /:testimonialId
    deletetestimonial: BASE_URL + "/admin/testimonials"      // + /:testimonialId
}

export const Testimonials = {
    submit: BASE_URL + "/testimonials",
    mine: BASE_URL + "/testimonials/mine",
    approved: BASE_URL + "/testimonials/approved"
}

export const AdminRecruiterApplications = {
    list: BASE_URL + "/admin/recruiter-applications",
    approve: BASE_URL + "/admin/recruiter-applications",   // + /:userId/approve
    reject: BASE_URL + "/admin/recruiter-applications"     // + /:userId/reject
}

export const AdminReports = {
    allreports: BASE_URL + "/admin/reports",
    updatereport: BASE_URL + "/admin/reports",   // + /:reportId
    deletereport: BASE_URL + "/admin/reports"    // + /:reportId
}
