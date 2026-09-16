import BASE_URL from '../../utils/backendUrl'

// deliberately separate from JobSearchApi.js sir — that's the unrelated private Tavily
// web-search feature (/job-search), this is the real recruiter-posted job board (/jobs)
export const JobData = {
    // recruiter management
    createJob: BASE_URL + "/jobs",
    listMyJobs: BASE_URL + "/jobs/mine",
    closeExpiredJobs: BASE_URL + "/jobs/close-expired",
    getJob: BASE_URL + "/jobs",              // + /:jobId
    updateJob: BASE_URL + "/jobs",            // + /:jobId
    updateInterviewEligibility: BASE_URL + "/jobs", // + /:jobId/interview-eligibility
    publishJob: BASE_URL + "/jobs",          // + /:jobId/publish
    closeJob: BASE_URL + "/jobs",            // + /:jobId/close
    deleteJob: BASE_URL + "/jobs",           // + /:jobId
    getJobApplicants: BASE_URL + "/jobs",    // + /:jobId/applicants
    getJobAnalytics: BASE_URL + "/jobs",     // + /:jobId/analytics
    getRecruiterOverviewAnalytics: BASE_URL + "/jobs/analytics-overview",
    inviteApplicantToTest: BASE_URL + "/job-applications", // + /:applicationId/invite
    toggleShortlist: BASE_URL + "/job-applications", // + /:applicationId/shortlist
    updateApplicantNotes: BASE_URL + "/job-applications", // + /:applicationId/notes
    setApplicationOutcome: BASE_URL + "/job-applications", // + /:applicationId/status
    bulkInviteApplicants: BASE_URL + "/jobs",   // + /:jobId/applicants/bulk-invite
    bulkApplicationOutcome: BASE_URL + "/jobs", // + /:jobId/applicants/bulk-status
    sendJobInvite: BASE_URL + "/jobs",       // + /:jobId/invite
    listJobInvites: BASE_URL + "/jobs",      // + /:jobId/invites

    // public
    listPublicJobs: BASE_URL + "/public/jobs",
    getPublicJob: BASE_URL + "/public/jobs", // + /:jobId
    getJobInviteByToken: BASE_URL + "/public/jobs/invite", // + /:token

    // candidate side
    applyToJob: BASE_URL + "/jobs",          // + /:jobId/apply
    listMyApplications: BASE_URL + "/job-applications/mine",
    toggleSavedJob: BASE_URL + "/jobs",      // + /:jobId/save
    listSavedJobs: BASE_URL + "/jobs/saved",
}
