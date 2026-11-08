// shared "15 Aug 2026" style date formatter sir — used anywhere a job posting's created date
// needs a human-readable stamp (JobList.jsx, JobBoard.jsx, JobDetail.jsx), so all three read
// identically instead of drifting into their own ad-hoc formats
export const formatJobDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// shared "08/11/2026" style date formatter sir, per 2026-11-08 audit — Home/PlanCheckout.jsx and
// Recruiter/RecruiterPlanCheckout.jsx already standardized their renewal-date disclosure on this
// exact DD/MM/YYYY style; Dashboard/Account.jsx and Recruiter/RecruiterAccount.jsx showed the
// SAME plan-expiry field in two other styles ("Sat Nov 08 2026" and "8 November 2026"), so a user
// saw a different date style at checkout than on their own account page for the identical date.
export const formatPlanExpiryDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
