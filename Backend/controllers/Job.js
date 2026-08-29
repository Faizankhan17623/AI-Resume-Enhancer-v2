const mongoose = require('mongoose')
const cloudinary = require('cloudinary').v2
const { PDFParse } = require('pdf-parse')

const Job = require('../Models/Job')
const JobApplication = require('../Models/JobApplication')
const Test = require('../Models/Test')
const TestAttempt = require('../Models/TestAttempt')
const User = require('../Models/User')
const logger = require('../utils/logger')
const mailSender = require('../utils/Nodemailer')
const { newApplicantAlertTemplate } = require('../Templates/NewApplicantAlert')
const { jobWithdrawnTemplate } = require('../Templates/JobWithdrawn')
const { testInviteTemplate } = require('../Templates/TestInvite')
const { applicationOutcomeTemplate } = require('../Templates/ApplicationOutcome')
const { validatePdfUpload } = require('../utils/pdfUpload')
const { runFitScore } = require('../services/fitScoreService')

// 2MB sir, per direct request — an application resume, not a full portfolio
const MAX_APPLICATION_RESUME_BYTES = 2 * 1024 * 1024

// how long a candidate has to START the test once invited sir, per direct request — distinct
// from Test.timeLimitMinutes (how long an in-progress ATTEMPT itself runs once started). Checked
// by Test.js's startAttempt.
const TEST_INVITE_WINDOW_MS = 5 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// recruiter-side sir
// ---------------------------------------------------------------------------

// POST /jobs — create a draft job posting sir
exports.createJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { companyName, title, description, location, employmentType, skills, compensationType, ctcMin, ctcMax, unpaidDurationMonths, certificateProvided } = req.body

        const job = await Job.create({
            recruiter: recruiterId,
            companyName,
            title,
            description,
            location,
            employmentType,
            skills,
            compensationType,
            ctcMin,
            ctcMax,
            unpaidDurationMonths,
            certificateProvided,
        })

        return res.status(201).json({
            success: true,
            message: 'Job created',
            job,
        })
    } catch (error) {
        (req.log || logger).error('create job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the job',
        })
    }
}

// GET /jobs/mine — recruiter's own job postings sir
exports.listMyJobs = async (req, res) => {
    try {
        const recruiterId = req?.User.id

        const jobs = await Job.find({ recruiter: recruiterId })
            .select('companyName title status location employmentType test createdAt updatedAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({ success: true, jobs })
    } catch (error) {
        (req.log || logger).error('list my jobs failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your jobs',
        })
    }
}

// GET /jobs/:jobId — full job sir, recruiter-owned only (use getPublicJob for the public view)
exports.getJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        // populate test's status/inviteCode sir — JobDetailRecruiter.jsx's "Proctored Test" card
        // needs to show whether an attached test is still a draft (and let the recruiter publish
        // it right there) instead of leaving that entirely undiscoverable outside of the separate
        // My Tests page (see the invite-blocking fix this unblocks: a job can be "published" while
        // its attached test is still a draft with no inviteCode — those are two independent states)
        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).populate('test', 'title status inviteCode timeLimitMinutes')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        return res.status(200).json({ success: true, job })
    } catch (error) {
        (req.log || logger).error('get job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the job',
        })
    }
}

// PATCH /jobs/:jobId sir — only while still a draft, same rule as Test.js's updateTest
exports.updateJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId })
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        if (job.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Only a draft job can be edited — close it and create a new one instead',
            })
        }

        const { companyName, title, description, location, employmentType, skills, compensationType, ctcMin, ctcMax, unpaidDurationMonths, certificateProvided } = req.body
        if (companyName !== undefined) job.companyName = companyName
        if (title !== undefined) job.title = title
        if (description !== undefined) job.description = description
        if (location !== undefined) job.location = location
        if (employmentType !== undefined) job.employmentType = employmentType
        if (skills !== undefined) job.skills = skills
        if (compensationType !== undefined) job.compensationType = compensationType
        if (ctcMin !== undefined) job.ctcMin = ctcMin
        if (ctcMax !== undefined) job.ctcMax = ctcMax
        if (unpaidDurationMonths !== undefined) job.unpaidDurationMonths = unpaidDurationMonths
        if (certificateProvided !== undefined) job.certificateProvided = certificateProvided

        await job.save()

        return res.status(200).json({ success: true, message: 'Job updated', job })
    } catch (error) {
        (req.log || logger).error('update job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the job',
        })
    }
}

// POST /jobs/:jobId/publish sir — a proctored test is now OPTIONAL, per direct request: a
// recruiter can publish and screen applicants purely on the application + AI fit-score if they
// don't want a test stage at all. Compensation info IS required before going public though,
// since candidates should never see a live listing with no idea what it pays.
exports.publishJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId })
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        if (!job.compensationType) {
            return res.status(400).json({
                success: false,
                message: 'Add compensation details (paid or unpaid) before publishing this job',
            })
        }

        // one active job posting sir — consumed here, at PUBLISH, not at draft-creation, since a
        // recruiter should be free to create and discard as many drafts as they like without it
        // counting against their monthly plan limit (see utils/RecruiterPlans.js)
        const { consumeJobPosting } = require('../utils/RecruiterPlans')
        const spend = await consumeJobPosting(recruiterId)
        if (!spend.ok) {
            return res.status(400).json({ success: false, message: spend.message, code: spend.code })
        }

        job.status = 'published'
        // 30-day expiry sir, starting fresh from THIS publish (re-publishing a closed job later
        // would reset the clock, which is the right behavior — it's a new listing going live again)
        job.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        await job.save()

        return res.status(200).json({ success: true, message: 'Job published', job })
    } catch (error) {
        (req.log || logger).error('publish job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while publishing the job',
        })
    }
}

// POST /jobs/:jobId/close sir — stops accepting new applications, existing ones untouched
exports.closeJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOneAndUpdate(
            { _id: jobId, recruiter: recruiterId },
            { status: 'closed' },
            { new: true }
        )
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        return res.status(200).json({ success: true, message: 'Job closed', job })
    } catch (error) {
        (req.log || logger).error('close job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while closing the job',
        })
    }
}

// DELETE /jobs/:jobId sir — a hard delete, for when the recruiter made a mistake posting it (per
// direct request). Every candidate who applied gets notified by email — best-effort, own
// try/catch, same as every other non-critical mail send in this file — since the alternative
// (silently vanishing) would leave them wondering why a job they applied to just disappeared.
// The JobApplications themselves are deleted too: a job that no longer exists shouldn't leave
// orphaned rows a candidate can still see under "My Applications".
exports.deleteJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId })
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const applications = await JobApplication.find({ job: jobId }).populate('candidate', 'firstName lastName email')

        await Promise.all([
            Job.deleteOne({ _id: jobId }),
            JobApplication.deleteMany({ job: jobId }),
        ])

        const frontendUrl = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
            : "http://localhost:5173"

        // allSettled sir, not all — one bad/dead candidate email must not stop the rest from
        // being notified. Individual failures are logged, never surfaced to the recruiter (the
        // job is already deleted at this point either way).
        await Promise.allSettled(applications.map((application) => {
            if (!application.candidate?.email) return Promise.resolve()
            return mailSender(
                application.candidate.email,
                'A Job You Applied To Was Withdrawn',
                jobWithdrawnTemplate(
                    application.candidate.firstName,
                    job.title,
                    job.companyName,
                    `${frontendUrl}/Jobs`
                )
            ).catch((mailError) => {
                (req.log || logger).error('job withdrawn mail failed', { err: mailError, jobId, candidateId: application.candidate._id })
            })
        }))

        return res.status(200).json({ success: true, message: 'Job deleted' })
    } catch (error) {
        (req.log || logger).error('delete job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the job',
        })
    }
}

// GET /jobs/:jobId/applicants sir — every candidate who's applied, for the recruiter to review
exports.getJobApplicants = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id test')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        // testPublished sir — distinct from jobHasTest (a test can be ATTACHED but still sitting
        // in draft, with no inviteCode yet — see inviteApplicantToTest's publish guard). The
        // frontend uses this to show "publish the test first" instead of a button that silently
        // does nothing.
        let testPublished = false
        if (job.test) {
            const test = await Test.findById(job.test).select('inviteCode')
            testPublished = !!test?.inviteCode
        }

        const applicants = await JobApplication.find({ job: jobId })
            .populate('candidate', 'firstName lastName email')
            .populate({ path: 'testAttempt', select: 'status score violationCount test', populate: { path: 'test', select: 'totalMarks' } })
            .populate('resume', 'label originalFilename')
            .populate('builtResume', 'title')
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, applicants, jobHasTest: !!job.test, testPublished })
    } catch (error) {
        (req.log || logger).error('get job applicants failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the applicants',
        })
    }
}

// GET /jobs/analytics-overview sir — a recruiter's totals ACROSS every job they've posted, plus
// a per-job breakdown so they can see which posting is actually performing without opening each
// one's own funnel (getJobAnalytics below) individually. One aggregation over JobApplication
// grouped by job, joined back onto the recruiter's own Job list in memory — cheap at the scale
// one recruiter's postings run at, no need for a $lookup pipeline.
exports.getRecruiterOverviewAnalytics = async (req, res) => {
    try {
        const recruiterId = req?.User.id

        const jobs = await Job.find({ recruiter: recruiterId }).select('title status views createdAt').sort({ createdAt: -1 })
        if (jobs.length === 0) {
            return res.status(200).json({
                success: true,
                analytics: {
                    totals: { jobs: 0, views: 0, applications: 0, invitedToTest: 0, hired: 0, rejected: 0, hireRate: 0 },
                    jobs: [],
                },
            })
        }

        const jobIds = jobs.map((j) => j._id)
        const [perJobCounts, perJobFitScore] = await Promise.all([
            JobApplication.aggregate([
                { $match: { job: { $in: jobIds } } },
                { $group: { _id: { job: '$job', status: '$status' }, count: { $sum: 1 } } },
            ]),
            // per direct request sir — "average fit score by job", cross-job comparison. Only
            // scored applications count toward the average (fitScore null means unscored/quota-
            // skipped, see fitScoreService.js), same reasoning as getJobAnalytics' own fitBreakdown.
            JobApplication.aggregate([
                { $match: { job: { $in: jobIds }, fitScore: { $ne: null } } },
                { $group: { _id: '$job', avgFitScore: { $avg: '$fitScore' } } },
            ]),
        ])
        const avgFitScoreByJob = new Map(perJobFitScore.map((r) => [String(r._id), Math.round(r.avgFitScore)]))

        // job._id -> { applied, invited_to_test, completed_test, rejected, hired } sir
        const countsByJob = new Map()
        for (const row of perJobCounts) {
            const jobId = String(row._id.job)
            if (!countsByJob.has(jobId)) countsByJob.set(jobId, {})
            countsByJob.get(jobId)[row._id.status] = row.count
        }

        let totalViews = 0, totalApplications = 0, totalInvited = 0, totalHired = 0, totalRejected = 0

        const jobBreakdown = jobs.map((job) => {
            const c = countsByJob.get(String(job._id)) || {}
            const applications = (c.applied || 0) + (c.invited_to_test || 0) + (c.completed_test || 0) + (c.rejected || 0) + (c.hired || 0)
            const invitedToTest = applications - (c.applied || 0)
            const hired = c.hired || 0
            const rejected = c.rejected || 0

            totalViews += job.views
            totalApplications += applications
            totalInvited += invitedToTest
            totalHired += hired
            totalRejected += rejected

            return {
                _id: job._id,
                title: job.title,
                status: job.status,
                views: job.views,
                applications,
                invitedToTest,
                hired,
                rejected,
                hireRate: applications ? Number(((hired / applications) * 100).toFixed(1)) : 0,
                avgFitScore: avgFitScoreByJob.get(String(job._id)) ?? null,
            }
        })

        // strongest posting first sir — most hires, ties broken by most applications, so the
        // recruiter's best-performing job surfaces at the top without them having to sort it themselves
        jobBreakdown.sort((a, b) => b.hired - a.hired || b.applications - a.applications)

        return res.status(200).json({
            success: true,
            analytics: {
                totals: {
                    jobs: jobs.length,
                    views: totalViews,
                    applications: totalApplications,
                    invitedToTest: totalInvited,
                    hired: totalHired,
                    rejected: totalRejected,
                    hireRate: totalApplications ? Number(((totalHired / totalApplications) * 100).toFixed(1)) : 0,
                },
                jobs: jobBreakdown,
            },
        })
    } catch (error) {
        (req.log || logger).error('get recruiter overview analytics failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your analytics overview',
        })
    }
}

// GET /jobs/:jobId/analytics sir — the funnel: views -> applications -> invited -> test
// completed -> hired/rejected, plus test-performance stats. One aggregation pass per
// collection, same Promise.all-of-independent-queries shape as Admin.js's getDashboardStats.
exports.getJobAnalytics = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('views test createdAt')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const [statusCounts, testStats, fitBreakdownRaw] = await Promise.all([
            JobApplication.aggregate([
                { $match: { job: job._id } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            job.test
                ? TestAttempt.aggregate([
                    { $match: { test: job.test } },
                    {
                        $group: {
                            _id: null,
                            totalAttempts: { $sum: 1 },
                            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                            terminatedViolations: { $sum: { $cond: [{ $eq: ['$status', 'terminated_violations'] }, 1, 0] } },
                            terminatedTimeout: { $sum: { $cond: [{ $eq: ['$status', 'terminated_timeout'] }, 1, 0] } },
                            avgScore: { $avg: '$score' },
                            avgViolations: { $avg: '$violationCount' },
                        },
                    },
                ])
                : Promise.resolve([]),
            // per direct request sir — "which fit-tier actually converts to hires" for this job.
            // Grouped by fitTier (null included, as 'not scored yet'/quota-skipped) with a
            // per-tier hired count, so the recruiter can see e.g. "80% of best_fit got hired" vs
            // "only 5% of not_a_fit did" instead of the fit score being disconnected from outcomes.
            JobApplication.aggregate([
                { $match: { job: job._id } },
                {
                    $group: {
                        _id: '$fitTier',
                        count: { $sum: 1 },
                        hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
                    },
                },
            ]),
        ])

        const FIT_TIER_ORDER = ['best_fit', 'hireable', 'can_get_it_done', 'not_a_fit']
        const fitBreakdown = FIT_TIER_ORDER.map((tier) => {
            const row = fitBreakdownRaw.find((r) => r._id === tier)
            return {
                tier,
                count: row?.count || 0,
                hired: row?.hired || 0,
                hireRate: row?.count ? Number(((row.hired / row.count) * 100).toFixed(1)) : 0,
            }
        })
        const unscoredRow = fitBreakdownRaw.find((r) => r._id === null || r._id === undefined)
        const unscored = {
            count: unscoredRow?.count || 0,
            hired: unscoredRow?.hired || 0,
        }

        const countFor = (status) => statusCounts.find((s) => s._id === status)?.count || 0
        const totalApplications = statusCounts.reduce((sum, s) => sum + s.count, 0)
        // every non-'applied' status implies the candidate was invited at some point sir —
        // cheaper than a second query, and status only ever moves forward, never back
        const invited = totalApplications - countFor('applied')
        const completedTest = countFor('completed_test') + countFor('hired') + countFor('rejected')
        const stats = testStats[0]

        return res.status(200).json({
            success: true,
            analytics: {
                funnel: {
                    views: job.views,
                    applications: totalApplications,
                    invitedToTest: invited,
                    completedTest,
                    hired: countFor('hired'),
                    rejected: countFor('rejected'),
                },
                rates: {
                    // percent of viewers who applied sir — 0 rather than NaN/Infinity when views is 0
                    viewToApplyRate: job.views ? Number(((totalApplications / job.views) * 100).toFixed(1)) : 0,
                    applyToInviteRate: totalApplications ? Number(((invited / totalApplications) * 100).toFixed(1)) : 0,
                    testCompletionRate: stats?.totalAttempts ? Number(((stats.completed / stats.totalAttempts) * 100).toFixed(1)) : 0,
                    hireRate: totalApplications ? Number(((countFor('hired') / totalApplications) * 100).toFixed(1)) : 0,
                },
                test: job.test ? {
                    totalAttempts: stats?.totalAttempts || 0,
                    completed: stats?.completed || 0,
                    terminatedViolations: stats?.terminatedViolations || 0,
                    terminatedTimeout: stats?.terminatedTimeout || 0,
                    avgScore: stats?.avgScore != null ? Math.round(stats.avgScore) : null,
                    avgViolations: stats?.avgViolations != null ? Number(stats.avgViolations.toFixed(1)) : 0,
                } : null,
                fitBreakdown,
                unscored,
            },
        })
    } catch (error) {
        (req.log || logger).error('get job analytics failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the job analytics',
        })
    }
}

// POST /job-applications/:applicationId/invite sir — the gate that actually lets this ONE
// candidate call Test.js's startAttempt for this job's test
exports.inviteApplicantToTest = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { applicationId } = req.params

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({ success: false, message: 'Invalid application id' })
        }

        const application = await JobApplication.findById(applicationId).populate('job').populate('candidate', 'firstName lastName email')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this application',
            })
        }

        if (!application.job.test) {
            return res.status(400).json({
                success: false,
                message: 'This job has no test attached yet',
            })
        }

        // same guard the bulk version already had sir — re-inviting an already-hired/rejected/
        // completed applicant makes no sense. 'invite_expired' IS eligible though — that's the
        // whole point of TestInviteExpiryCron.js flipping it there instead of leaving the
        // recruiter stuck with no path back to inviting this candidate again.
        if (!['applied', 'invite_expired'].includes(application.status)) {
            return res.status(400).json({
                success: false,
                message: 'Only a newly-applied or expired-invite candidate can be invited to test',
            })
        }

        // the test must actually be PUBLISHED sir — publishTest is what generates inviteCode
        // (controllers/Test.js), and a draft test has none. Without this check the application
        // still flipped to invited_to_test and the mail block below silently no-op'd on
        // `test?.inviteCode` being falsy — the recruiter saw a false "invited" success with no
        // email ever sent and no way to know why. Block it up front with a clear message instead.
        const test = await Test.findById(application.job.test).select('inviteCode timeLimitMinutes status')
        if (!test?.inviteCode) {
            return res.status(400).json({
                success: false,
                message: 'Publish this job\'s test before inviting candidates to it',
            })
        }

        application.status = 'invited_to_test'
        application.testInviteExpiresAt = new Date(Date.now() + TEST_INVITE_WINDOW_MS)
        await application.save()

        // best-effort test-invite email sir — same pattern as every other non-critical mail
        // send in this file, wrapped so a relay hiccup never fails the invite itself
        try {
            if (test?.inviteCode && application.candidate?.email) {
                const frontendUrl = process.env.FRONTEND_URL
                    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
                    : "http://localhost:5173"
                await mailSender(
                    application.candidate.email,
                    "You're Invited to a Test — Resumify",
                    testInviteTemplate(
                        application.candidate.firstName,
                        application.job.title,
                        application.job.companyName,
                        `${frontendUrl}/Test/${test.inviteCode}`,
                        test.timeLimitMinutes
                    )
                )
            }
        } catch (mailError) {
            (req.log || logger).error('test invite mail failed', { err: mailError, applicationId })
        }

        return res.status(200).json({
            success: true,
            message: 'Candidate invited to take the test',
            application,
        })
    } catch (error) {
        (req.log || logger).error('invite applicant to test failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while inviting the candidate',
        })
    }
}

// PATCH /job-applications/:applicationId/shortlist sir — the recruiter's own "flag for later",
// per direct request. Deliberately separate from setApplicationOutcome below: shortlisting isn't
// a final outcome, it works at ANY status (including already hired/rejected — a recruiter might
// still want to flag one for their own reference), and toggles rather than sets a specific value
// since the frontend only ever needs "flip it".
exports.toggleShortlist = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { applicationId } = req.params

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({ success: false, message: 'Invalid application id' })
        }

        const application = await JobApplication.findById(applicationId).populate('job', 'recruiter')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this application',
            })
        }

        application.shortlisted = !application.shortlisted
        await application.save()

        return res.status(200).json({
            success: true,
            message: application.shortlisted ? 'Added to shortlist' : 'Removed from shortlist',
            shortlisted: application.shortlisted,
        })
    } catch (error) {
        (req.log || logger).error('toggle shortlist failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the shortlist',
        })
    }
}

// PATCH /job-applications/:applicationId/status sir — the recruiter recording an outcome.
//
// 'hired' still requires the candidate to have actually finished the job's test (if it has
// one) — you can't hire someone who never completed the screening step for a job that has a
// screening step. If the job has NO test at all (see Part 4a — tests are optional now), 'hired'
// is reachable straight from 'applied', since there's no test stage to gate on.
//
// 'rejected' is different, per direct request: a recruiter can close/reject an application at
// ANY stage — applied, invited, completed — not only after the test. This is the "manually close
// this application" action described in the applicant list.
exports.setApplicationOutcome = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { applicationId } = req.params
        const { status } = req.body

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({ success: false, message: 'Invalid application id' })
        }
        if (!['hired', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be hired or rejected' })
        }

        const application = await JobApplication.findById(applicationId).populate('job').populate('candidate', 'firstName lastName email')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this application',
            })
        }

        if (status === 'hired') {
            const jobHasTest = !!application.job.test
            const eligible = jobHasTest ? application.status === 'completed_test' : application.status === 'applied'
            if (!eligible) {
                return res.status(400).json({
                    success: false,
                    message: jobHasTest
                        ? 'This candidate has not completed the test yet'
                        : 'This candidate cannot be hired from its current status',
                })
            }
        }

        application.status = status
        await application.save()

        // best-effort hire/reject email sir — same pattern as every other non-critical mail send
        // in this file (test invites, job-withdrawn notices), wrapped so a relay hiccup never
        // fails the recruiter's action itself. Previously NOTHING was ever sent for this outcome
        // at all — a candidate had no way to find out except by checking the dashboard themselves.
        try {
            if (application.candidate?.email) {
                await mailSender(
                    application.candidate.email,
                    status === 'hired' ? "You're Hired! — Resumify" : 'Application Update — Resumify',
                    applicationOutcomeTemplate(application.candidate.firstName, application.job.title, application.job.companyName, status === 'hired')
                )
            }
        } catch (mailError) {
            (req.log || logger).error('application outcome mail failed', { err: mailError, applicationId })
        }

        return res.status(200).json({
            success: true,
            message: status === 'hired' ? 'Candidate marked as hired' : 'Candidate rejected',
            application,
        })
    } catch (error) {
        (req.log || logger).error('set application outcome failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the application',
        })
    }
}

// POST /jobs/:jobId/applicants/bulk-invite sir — invite several 'applied' candidates for THIS
// job to its test in one go, body: { applicationIds: [...] }. Same skip-invalid-rather-than-fail
// shape as Admin.js's bulkBanUsers: a stale/already-progressed row is skipped, not a hard failure
// that blocks the rest of a legitimate batch. Scoped to one recruiter-owned job (not global
// applicationIds) so a recruiter can't act on another recruiter's applicants by id-guessing.
exports.bulkInviteApplicantsToTest = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params
        const { applicationIds } = req.body

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }
        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ success: false, message: 'applicationIds must be a non-empty array' })
        }
        if (applicationIds.length > 200) {
            return res.status(400).json({ success: false, message: 'Cannot act on more than 200 applicants at once' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id title companyName test')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }
        if (!job.test) {
            return res.status(400).json({ success: false, message: 'This job has no test attached yet' })
        }

        const test = await Test.findById(job.test).select('inviteCode timeLimitMinutes')

        // same publish check as the single-invite path above sir — without this a draft test's
        // applications still flip to invited_to_test with zero emails ever sent, silently
        if (!test?.inviteCode) {
            return res.status(400).json({
                success: false,
                message: 'Publish this job\'s test before inviting candidates to it',
            })
        }

        const validIds = applicationIds.filter((id) => mongoose.isValidObjectId(id))
        const applications = await JobApplication.find({ _id: { $in: validIds }, job: jobId }).populate('candidate', 'firstName lastName email')

        const invited = []
        const skipped = []
        const toEmail = []
        for (const application of applications) {
            // 'invite_expired' is eligible too sir — same reasoning as the single-invite path above
            if (!['applied', 'invite_expired'].includes(application.status)) {
                skipped.push(String(application._id))
                continue
            }
            application.status = 'invited_to_test'
            application.testInviteExpiresAt = new Date(Date.now() + TEST_INVITE_WINDOW_MS)
            await application.save()
            invited.push(String(application._id))
            if (application.candidate?.email) toEmail.push(application.candidate)
        }

        // best-effort test-invite emails sir — allSettled, same reasoning as deleteJob's
        // candidate-notification send: one bad address must not stop the rest
        if (test?.inviteCode) {
            const frontendUrl = process.env.FRONTEND_URL
                ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
                : "http://localhost:5173"
            await Promise.allSettled(toEmail.map((candidate) =>
                mailSender(
                    candidate.email,
                    "You're Invited to a Test — Resumify",
                    testInviteTemplate(candidate.firstName, job.title, job.companyName, `${frontendUrl}/Test/${test.inviteCode}`, test.timeLimitMinutes)
                ).catch((mailError) => {
                    (req.log || logger).error('bulk test invite mail failed', { err: mailError, jobId, candidateId: candidate._id })
                })
            ))
        }

        return res.status(200).json({
            success: true,
            message: `${invited.length} candidate${invited.length === 1 ? '' : 's'} invited to the test${skipped.length ? `, ${skipped.length} skipped (already progressed)` : ''}`,
            invited,
            skipped,
        })
    } catch (error) {
        (req.log || logger).error('bulk invite applicants failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while inviting the candidates',
        })
    }
}

// PATCH /jobs/:jobId/applicants/bulk-status sir — hire/reject several 'completed_test'
// candidates for THIS job in one go, body: { applicationIds: [...], status }. Same
// completed-test-only gate as the single setApplicationOutcome above, same skip-not-fail shape.
exports.bulkSetApplicationOutcome = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params
        const { applicationIds, status } = req.body

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }
        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ success: false, message: 'applicationIds must be a non-empty array' })
        }
        if (applicationIds.length > 200) {
            return res.status(400).json({ success: false, message: 'Cannot act on more than 200 applicants at once' })
        }
        if (!['hired', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be hired or rejected' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id test title companyName')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const validIds = applicationIds.filter((id) => mongoose.isValidObjectId(id))
        const applications = await JobApplication.find({ _id: { $in: validIds }, job: jobId }).populate('candidate', 'firstName lastName email')

        // same rule as the single-application version above sir — 'rejected' works from ANY
        // status (the manual "close this application" action), 'hired' still needs the test
        // completed if the job has one, or 'applied' if it doesn't
        const jobHasTest = !!job.test
        const updated = []
        const skipped = []
        const toEmail = []
        for (const application of applications) {
            const eligible = status === 'rejected'
                ? true
                : jobHasTest ? application.status === 'completed_test' : application.status === 'applied'
            if (!eligible) {
                skipped.push(String(application._id))
                continue
            }
            application.status = status
            await application.save()
            updated.push(String(application._id))
            if (application.candidate?.email) toEmail.push(application.candidate)
        }

        // best-effort hire/reject emails sir — allSettled, same reasoning as bulkInviteApplicantsToTest's
        // own mail send above: one bad address must not stop the rest
        if (toEmail.length) {
            await Promise.allSettled(toEmail.map((candidate) =>
                mailSender(
                    candidate.email,
                    status === 'hired' ? "You're Hired! — Resumify" : 'Application Update — Resumify',
                    applicationOutcomeTemplate(candidate.firstName, job.title, job.companyName, status === 'hired')
                ).catch((mailError) => {
                    (req.log || logger).error('bulk application outcome mail failed', { err: mailError, jobId, candidateId: candidate._id })
                })
            ))
        }

        return res.status(200).json({
            success: true,
            message: `${updated.length} candidate${updated.length === 1 ? '' : 's'} ${status === 'hired' ? 'marked as hired' : 'rejected'}${skipped.length ? `, ${skipped.length} skipped` : ''}`,
            updated,
            skipped,
        })
    } catch (error) {
        (req.log || logger).error('bulk set application outcome failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the applications',
        })
    }
}

// ---------------------------------------------------------------------------
// public sir — no auth required, published jobs only
// ---------------------------------------------------------------------------

// GET /jobs?page=1&limit=20&search=foo&location=&employmentType=&skill= sir — the public board
exports.listPublicJobs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
        const search = (req.query.search || '').trim()
        const location = (req.query.location || '').trim()
        const employmentType = (req.query.employmentType || '').trim()
        const skill = (req.query.skill || '').trim()

        const filter = { status: 'published' }
        if (search) {
            // same safe-regex escape as controllers/Admin.js's getUsers sir
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            filter.$or = [
                { title: { $regex: safe, $options: 'i' } },
                { companyName: { $regex: safe, $options: 'i' } },
                { skills: { $regex: safe, $options: 'i' } },
            ]
        }
        if (location) filter.location = { $regex: location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
        if (['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'].includes(employmentType)) {
            filter.employmentType = employmentType
        }
        if (skill) filter.skills = { $regex: skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }

        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .select('companyName title location employmentType skills createdAt expiresAt compensationType ctcMin ctcMax unpaidDurationMonths certificateProvided')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Job.countDocuments(filter),
        ])

        return res.status(200).json({
            success: true,
            jobs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        })
    } catch (error) {
        (req.log || logger).error('list public jobs failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting jobs',
        })
    }
}

// GET /jobs/public/:jobId sir — single published job, public detail view
exports.getPublicJob = async (req, res) => {
    try {
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        // $inc in the same query that gates on status:'published' sir — a closed/draft job
        // (404s below) never bumps the counter, and this is a single atomic write, not a
        // read-then-write race
        const job = await Job.findOneAndUpdate(
            { _id: jobId, status: 'published' },
            { $inc: { views: 1 } },
            { new: true }
        )
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        return res.status(200).json({ success: true, job })
    } catch (error) {
        (req.log || logger).error('get public job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the job',
        })
    }
}

// ---------------------------------------------------------------------------
// candidate-side sir — plain 'User' accounts, isUser-gated same as Test.js's candidate routes
// ---------------------------------------------------------------------------

// POST /jobs/:jobId/apply sir — creates the application, blocked on a duplicate by the
// unique { job, candidate } index rather than a pre-check (closes the same race a
// check-then-create would leave open)
// applies with the structured multi-step form sir — multipart/form-data, the JSON fields
// arriving pre-parsed as req.body (see Routes/Job.js's parseMultipartJson + applyToJobSchema),
// the resume PDF riding as req.files.resume (<2MB, PDF-only, same validatePdfUpload used by every
// other resume intake in this app). Replaces the old one-click "attach a saved resume" flow —
// every new application uploads a real file here instead of picking from the candidate's library.
exports.applyToJob = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const { jobId } = req.params
        const {
            experienceLevel, address, expectedSalary,
            education, currentCtc, workHistory,
        } = req.body

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const resumeFile = req.files?.resume
        const uploadError = validatePdfUpload(resumeFile)
        if (uploadError) {
            return res.status(400).json({ success: false, message: uploadError })
        }
        if (resumeFile.size > MAX_APPLICATION_RESUME_BYTES) {
            return res.status(400).json({ success: false, message: 'Resume must be under 2MB' })
        }

        // title + recruiter selected here too sir — needed below to email the recruiter and to
        // score the resume against the job's own description once the application is created
        const job = await Job.findOne({ _id: jobId, status: 'published' }).select('_id title description recruiter')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        // extract the resume's plain text sir — same PDFParse call every other resume-intake
        // controller in this app already uses (controllers/AI.js's Calling), needed below to
        // feed the AI fit-score
        const parser = new PDFParse({ data: resumeFile.data })
        const parsed = await parser.getText()
        const resumeText = parsed?.text || ''

        // upload the actual PDF to Cloudinary sir — resource_type:'raw' since this is a
        // non-image file, which every other Cloudinary upload in this app (photos, snapshots)
        // never needed to set.
        //
        // public_id MUST end in .pdf sir — a raw resource with no extension on its public_id
        // gets served with no reliable Content-Type, so the browser can't tell it's a PDF and
        // downloads it instead of opening it inline (the "View resume" button forcing a
        // download instead of a preview). Every other Cloudinary asset in this app is an
        // image (resource_type:'auto'), which doesn't hit this — raw delivery is the one place
        // the extension has to be explicit.
        //
        // Investigated switching this to resource_type:'image' sir (Cloudinary's documented
        // approach for inline-viewable PDFs) after a headless-Chromium Playwright test showed a
        // blank iframe — but the SAME blank result reproduced on a known-good public PDF from
        // W3C's own test suite in an unrelated iframe, with no Cloudinary or app code involved
        // at all. That isolates it to headless Chromium's build lacking the PDFium inline-viewer
        // plugin (a well-known limitation of the stock binary Playwright downloads), not a real
        // app bug — reverted back to this already-correct, already-verified 'raw' + .pdf-suffix
        // fix from earlier this session rather than ship an unverified change.
        const upload = await cloudinary.uploader.upload(
            `data:${resumeFile.mimetype};base64,${resumeFile.data.toString('base64')}`,
            {
                folder: 'job-application-resumes',
                resource_type: 'raw',
                public_id: `${jobId}-${candidateId}-${Date.now()}.pdf`,
            }
        )

        let application
        try {
            application = await JobApplication.create({
                job: jobId,
                candidate: candidateId,
                resumeUrl: upload.secure_url,
                resumePublicId: upload.public_id,
                experienceLevel,
                address,
                expectedSalary,
                education: experienceLevel === 'fresher' ? education : undefined,
                currentCtc: experienceLevel === 'experienced' ? currentCtc : undefined,
                workHistory: experienceLevel === 'experienced' ? workHistory : undefined,
            })
        } catch (createErr) {
            if (createErr.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already applied to this job',
                })
            }
            throw createErr
        }

        // AI fit-score sir — best-effort, wrapped in its own try/catch exactly like the
        // new-applicant email below: a scoring failure or a recruiter out of monthly AI-score
        // quota must never fail the candidate's application. fitScore stays null either way,
        // fitScoreSkippedReason explains why to the recruiter.
        try {
            const scoreResult = await runFitScore({
                recruiterId: job.recruiter,
                jobDescription: job.description,
                resumeText,
            })
            if (scoreResult.ok) {
                application.fitScore = scoreResult.fitScore
                application.fitTier = scoreResult.fitTier
                application.fitScoreReasoning = scoreResult.reasoning
            } else {
                application.fitScoreSkippedReason = scoreResult.reason
            }
            await application.save()
        } catch (scoreError) {
            (req.log || logger).error('fit score failed', { err: scoreError, applicationId: application._id })
        }

        // email the recruiter sir — best-effort, wrapped in its own try/catch so a mail relay
        // hiccup never fails the candidate's application response (same pattern as e.g.
        // deleteAccount's mail send in controllers/user.js)
        try {
            const [recruiter, candidate] = await Promise.all([
                User.findById(job.recruiter).select('firstName email notifyNewApplicant'),
                User.findById(candidateId).select('firstName lastName'),
            ])
            if (recruiter?.notifyNewApplicant !== false) {
                const frontendUrl = process.env.FRONTEND_URL
                    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
                    : "http://localhost:5173"
                await mailSender(
                    recruiter.email,
                    'New Applicant — Resumify Recruiter',
                    newApplicantAlertTemplate(
                        recruiter.firstName,
                        `${candidate.firstName} ${candidate.lastName}`,
                        job.title,
                        `${frontendUrl}/Recruiter/Jobs/${jobId}/applicants`,
                        `${frontendUrl}/Recruiter/Account`
                    )
                )
            }
        } catch (mailError) {
            (req.log || logger).error('new applicant alert mail failed', { err: mailError })
        }

        return res.status(201).json({
            success: true,
            message: 'Application submitted',
            application,
        })
    } catch (error) {
        (req.log || logger).error('apply to job failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while applying to the job',
        })
    }
}

// GET /job-applications/mine sir — candidate's own applications, for their dashboard
exports.listMyApplications = async (req, res) => {
    try {
        const candidateId = req?.User.id

        const applications = await JobApplication.find({ candidate: candidateId })
            .populate('job', 'companyName title location employmentType status')
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, applications })
    } catch (error) {
        (req.log || logger).error('list my applications failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your applications',
        })
    }
}
