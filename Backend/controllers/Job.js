const mongoose = require('mongoose')

const Job = require('../Models/Job')
const JobApplication = require('../Models/JobApplication')
const Resume = require('../Models/Resume')
const BuiltResume = require('../Models/BuiltResume')
const Test = require('../Models/Test')
const TestAttempt = require('../Models/TestAttempt')
const logger = require('../utils/logger')

// ---------------------------------------------------------------------------
// recruiter-side sir
// ---------------------------------------------------------------------------

// POST /jobs — create a draft job posting sir
exports.createJob = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { companyName, title, description, location, employmentType, skills } = req.body

        const job = await Job.create({
            recruiter: recruiterId,
            companyName,
            title,
            description,
            location,
            employmentType,
            skills,
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

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId })
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

        const { companyName, title, description, location, employmentType, skills } = req.body
        if (companyName !== undefined) job.companyName = companyName
        if (title !== undefined) job.title = title
        if (description !== undefined) job.description = description
        if (location !== undefined) job.location = location
        if (employmentType !== undefined) job.employmentType = employmentType
        if (skills !== undefined) job.skills = skills

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

// POST /jobs/:jobId/publish sir — a job needs a test attached before it can go public,
// since the whole point of this feature is proctored screening
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

        if (!job.test) {
            return res.status(400).json({
                success: false,
                message: 'Attach and publish a test for this job before publishing it',
            })
        }

        job.status = 'published'
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

// GET /jobs/:jobId/applicants sir — every candidate who's applied, for the recruiter to review
exports.getJobApplicants = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const applicants = await JobApplication.find({ job: jobId })
            .populate('candidate', 'firstName lastName email')
            .populate('testAttempt', 'status score violationCount')
            .populate('resume', 'label originalFilename')
            .populate('builtResume', 'title')
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, applicants })
    } catch (error) {
        (req.log || logger).error('get job applicants failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the applicants',
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

        const [statusCounts, testStats] = await Promise.all([
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
        ])

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

        const application = await JobApplication.findById(applicationId).populate('job')
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

        application.status = 'invited_to_test'
        await application.save()

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

// PATCH /job-applications/:applicationId/status sir — the recruiter recording an outcome.
// Only reachable from 'completed_test': hiring/rejecting someone who hasn't finished the
// screening step yet isn't a status this app's funnel supports, same "the test is the gate"
// philosophy as inviteApplicantToTest above.
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

        const application = await JobApplication.findById(applicationId).populate('job')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this application',
            })
        }

        if (application.status !== 'completed_test') {
            return res.status(400).json({
                success: false,
                message: 'This candidate has not completed the test yet',
            })
        }

        application.status = status
        await application.save()

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

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id test')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }
        if (!job.test) {
            return res.status(400).json({ success: false, message: 'This job has no test attached yet' })
        }

        const validIds = applicationIds.filter((id) => mongoose.isValidObjectId(id))
        const applications = await JobApplication.find({ _id: { $in: validIds }, job: jobId })

        const invited = []
        const skipped = []
        for (const application of applications) {
            if (application.status !== 'applied') {
                skipped.push(String(application._id))
                continue
            }
            application.status = 'invited_to_test'
            await application.save()
            invited.push(String(application._id))
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

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const validIds = applicationIds.filter((id) => mongoose.isValidObjectId(id))
        const applications = await JobApplication.find({ _id: { $in: validIds }, job: jobId })

        const updated = []
        const skipped = []
        for (const application of applications) {
            if (application.status !== 'completed_test') {
                skipped.push(String(application._id))
                continue
            }
            application.status = status
            await application.save()
            updated.push(String(application._id))
        }

        return res.status(200).json({
            success: true,
            message: `${updated.length} candidate${updated.length === 1 ? '' : 's'} ${status === 'hired' ? 'marked as hired' : 'rejected'}${skipped.length ? `, ${skipped.length} skipped (test not completed)` : ''}`,
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
                .select('companyName title location employmentType skills createdAt')
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
exports.applyToJob = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const { jobId } = req.params
        const { resume, builtResume } = req.body

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, status: 'published' }).select('_id')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        // ownership check sir — a candidate could otherwise attach someone else's saved
        // resume/built-resume to their application just by guessing its ObjectId
        if (resume) {
            if (!mongoose.isValidObjectId(resume)) {
                return res.status(400).json({ success: false, message: 'Invalid resume id' })
            }
            const owns = await Resume.exists({ _id: resume, user: candidateId })
            if (!owns) {
                return res.status(403).json({ success: false, message: 'That resume does not belong to you' })
            }
        }
        if (builtResume) {
            if (!mongoose.isValidObjectId(builtResume)) {
                return res.status(400).json({ success: false, message: 'Invalid built resume id' })
            }
            const owns = await BuiltResume.exists({ _id: builtResume, user: candidateId })
            if (!owns) {
                return res.status(403).json({ success: false, message: 'That resume does not belong to you' })
            }
        }

        let application
        try {
            application = await JobApplication.create({
                job: jobId,
                candidate: candidateId,
                resume,
                builtResume,
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
