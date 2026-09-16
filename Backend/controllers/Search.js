// global command-palette search sir — one endpoint, branches by req.User.role. Every query is
// scoped to the caller's own data (user: userId / recruiter: recruiterId), same discipline as
// every other controller in this app — this is a convenience feature, not a new way to read
// someone else's records. Admin's branch is the one exception: an admin genuinely needs to look
// users/jobs/reports up across the whole app, which is exactly what the existing Admin.js
// controllers already allow — this just gives it one fast lookup instead of five separate list
// pages.
//
// Deliberately plain case-insensitive regex matching sir, not a text index or a vector/embedding
// search: the fields being searched (a resume's label, a job's title, a user's name/email) are
// short, and the collections here are small enough per-user/per-recruiter that this is instant.
// A $text index would need maintaining across every one of these models for a feature this
// lightweight — not worth it.

const Resume = require('../Models/Resume')
const BuiltResume = require('../Models/BuiltResume')
const CoverLetter = require('../Models/CoverLetter')
const JobApplication = require('../Models/JobApplication')
const Job = require('../Models/Job')
const Test = require('../Models/Test')
const Report = require('../Models/Report')
const logger = require('../utils/logger')

const RESULT_LIMIT = 5 // per category sir — a palette shows a handful, not a full list

// builds a case-insensitive "contains" regex sir — escaped so a query like "c++" or "a.b" can't
// be (mis)read as regex syntax by whatever the caller typed
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const containsRegex = (q) => new RegExp(escapeRegex(q), 'i')

const searchAsUser = async (userId, q) => {
    const re = containsRegex(q)

    const [resumes, builtResumes, coverLetters, applications] = await Promise.all([
        Resume.find({ user: userId, label: re }).select('label').limit(RESULT_LIMIT),
        BuiltResume.find({ user: userId, title: re }).select('title').limit(RESULT_LIMIT),
        CoverLetter.find({ user: userId, title: re }).select('title').limit(RESULT_LIMIT),
        JobApplication.find({ candidate: userId }).populate({ path: 'job', match: { title: re }, select: 'title companyName' }).limit(RESULT_LIMIT * 2),
    ])

    return {
        resumes: resumes.map((r) => ({ id: r._id, label: r.label, link: '/Dashboard/Resumes' })),
        builtResumes: builtResumes.map((r) => ({ id: r._id, label: r.title, link: `/Dashboard/Build-Resume?id=${r._id}` })),
        coverLetters: coverLetters.map((c) => ({ id: c._id, label: c.title, link: '/Dashboard/Cover-Letter' })),
        applications: applications
            .filter((a) => a.job)
            .slice(0, RESULT_LIMIT)
            .map((a) => ({ id: a._id, label: `${a.job.title} at ${a.job.companyName}`, link: '/Dashboard/My-Applications' })),
    }
}

const searchAsRecruiter = async (recruiterId, q) => {
    const re = containsRegex(q)

    const [jobs, tests] = await Promise.all([
        Job.find({ recruiter: recruiterId, title: re }).select('title status').limit(RESULT_LIMIT),
        Test.find({ recruiter: recruiterId, title: re }).select('title').limit(RESULT_LIMIT),
    ])

    // applicants matched by candidate name/email sir — scoped to jobs this recruiter owns,
    // never a global user lookup
    const recruiterJobIds = await Job.find({ recruiter: recruiterId }).select('_id')
    const applicants = await JobApplication.find({ job: { $in: recruiterJobIds.map((j) => j._id) } })
        .populate({ path: 'candidate', match: { $or: [{ firstName: re }, { lastName: re }, { email: re }] }, select: 'firstName lastName email' })
        .populate('job', 'title')
        .limit(RESULT_LIMIT * 3)

    return {
        jobs: jobs.map((j) => ({ id: j._id, label: j.title, link: `/Recruiter/Jobs/${j._id}` })),
        tests: tests.map((t) => ({ id: t._id, label: t.title, link: '/Recruiter/Tests' })),
        applicants: applicants
            .filter((a) => a.candidate)
            .slice(0, RESULT_LIMIT)
            .map((a) => ({ id: a._id, label: `${a.candidate.firstName} ${a.candidate.lastName} — ${a.job?.title || ''}`, link: `/Recruiter/Jobs/${a.job?._id}/applicants` })),
    }
}

// admin/support both land here sir — same read-only lookup, no write access implied by search
// itself (every mutating admin action still goes through Admin.js's own routes/checks).
//
// Deliberately does NOT search users here sir: Admin.js already has a dedicated, more capable
// user search (GET /admin/search, AdminNav.jsx's always-visible search bar — shows ban status,
// links straight to a highlighted row on the Users page). Duplicating that here in a second,
// less-featured form would just give admins two different "search users" boxes that can drift
// apart. This endpoint's admin branch covers what THAT one doesn't: jobs and reports.
const searchAsAdmin = async (q) => {
    const re = containsRegex(q)

    const [jobs, reports] = await Promise.all([
        Job.find({ $or: [{ title: re }, { companyName: re }] }).select('title companyName').limit(RESULT_LIMIT),
        Report.find({ description: re }).select('description').limit(RESULT_LIMIT),
    ])

    return {
        jobs: jobs.map((j) => ({ id: j._id, label: `${j.title} — ${j.companyName}`, link: '/Admin/Recruiter-Data-Health' })),
        reports: reports.map((r) => ({ id: r._id, label: r.description?.slice(0, 80), link: '/Admin/Reports' })),
    }
}

// GET /search?q=... sir — Auth-gated only (any role), branches internally. See the file header
// comment for why this is safe: every branch scopes to the caller's own data except Admin/
// Support, which already have full read access to these collections via their existing pages.
exports.search = async (req, res) => {
    try {
        const q = (req.query.q || '').trim()
        if (q.length < 2) {
            return res.status(200).json({ success: true, results: {} })
        }
        // cap sir — a runaway-length query string is pointless to regex-match and cheap to reject
        if (q.length > 100) {
            return res.status(400).json({ success: false, message: 'Search query is too long' })
        }

        const role = req.User.role
        const userId = req.User.id

        let results
        if (role === 'Recruiter') {
            results = await searchAsRecruiter(userId, q)
        } else if (role === 'Admin' || role === 'Support') {
            results = await searchAsAdmin(q)
        } else {
            results = await searchAsUser(userId, q)
        }

        return res.status(200).json({ success: true, results })
    } catch (error) {
        (req.log || logger).error('global search failed', { err: error, userId: req?.User?.id })
        return res.status(500).json({ success: false, message: 'Search failed' })
    }
}
