import BASE_URL from '../../utils/backendUrl'

// deliberately separate from JobSearchApi.js sir — that's the unrelated private Tavily
// web-search feature (/job-search), this is the real recruiter-posted job board (/jobs)
export const JobData = {
    // recruiter management
    createJob: BASE_URL + "/jobs",
    listMyJobs: BASE_URL + "/jobs/mine",
    getJob: BASE_URL + "/jobs",              // + /:jobId
    updateJob: BASE_URL + "/jobs",            // + /:jobId
    publishJob: BASE_URL + "/jobs",          // + /:jobId/publish
    closeJob: BASE_URL + "/jobs",            // + /:jobId/close
    getJobApplicants: BASE_URL + "/jobs",    // + /:jobId/applicants
    getJobAnalytics: BASE_URL + "/jobs",     // + /:jobId/analytics
    getRecruiterOverviewAnalytics: BASE_URL + "/jobs/analytics-overview",
    inviteApplicantToTest: BASE_URL + "/job-applications", // + /:applicationId/invite
    setApplicationOutcome: BASE_URL + "/job-applications", // + /:applicationId/status
    bulkInviteApplicants: BASE_URL + "/jobs",   // + /:jobId/applicants/bulk-invite
    bulkApplicationOutcome: BASE_URL + "/jobs", // + /:jobId/applicants/bulk-status

    // public
    listPublicJobs: BASE_URL + "/public/jobs",
    getPublicJob: BASE_URL + "/public/jobs", // + /:jobId

    // candidate side
    applyToJob: BASE_URL + "/jobs",          // + /:jobId/apply
    listMyApplications: BASE_URL + "/job-applications/mine",
}
