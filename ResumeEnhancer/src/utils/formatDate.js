// shared "15 Aug 2026" style date formatter sir — used anywhere a job posting's created date
// needs a human-readable stamp (JobList.jsx, JobBoard.jsx, JobDetail.jsx), so all three read
// identically instead of drifting into their own ad-hoc formats
export const formatJobDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
