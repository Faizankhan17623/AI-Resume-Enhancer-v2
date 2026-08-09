const mongoose = require('mongoose')
const logger = require('../utils/logger')
const Application = require('../Models/Application')
const Review = require('../Models/Review')
const Resume = require('../Models/Resume')
const BuiltResume = require('../Models/BuiltResume')
const { getUserPlan } = require('../utils/Plans')

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected']

// POST /applications — add a card to the tracker sir, no AI call, no credit spent
exports.createApplication = async (req, res) => {
    try {
        const id = req?.User.id
        const { company, role, status, location, jobUrl, notes, appliedDate, resume, builtResume, review } = req.body

        if (!company?.trim() || !role?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Company and role are required',
            })
        }

        if (status && !STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status',
            })
        }

        if (resume) {
            if (!mongoose.isValidObjectId(resume)) {
                return res.status(400).json({ success: false, message: 'Invalid resume id' })
            }
            // must be one of THIS user's own resumes sir — same ownership check as review below,
            // which resume/builtResume were missing (only their ObjectId FORMAT was validated,
            // never that the id actually belongs to the caller)
            const ownedResume = await Resume.exists({ _id: resume, user: id })
            if (!ownedResume) {
                return res.status(400).json({ success: false, message: 'Resume not found' })
            }
        }
        if (builtResume) {
            if (!mongoose.isValidObjectId(builtResume)) {
                return res.status(400).json({ success: false, message: 'Invalid built resume id' })
            }
            const ownedBuiltResume = await BuiltResume.exists({ _id: builtResume, user: id })
            if (!ownedBuiltResume) {
                return res.status(400).json({ success: false, message: 'Built resume not found' })
            }
        }
        if (review) {
            if (!mongoose.isValidObjectId(review)) {
                return res.status(400).json({ success: false, message: 'Invalid review id' })
            }
            // must be one of THIS user's own reviews sir, not just any valid id
            const owned = await Review.exists({ _id: review, user: id })
            if (!owned) {
                return res.status(400).json({ success: false, message: 'Review not found' })
            }
        }

        const application = await Application.create({
            user: id,
            company: company.trim().slice(0, 120),
            role: role.trim().slice(0, 120),
            status: status || 'Applied',
            location: location?.trim().slice(0, 120),
            jobUrl: jobUrl?.trim().slice(0, 500),
            notes: notes?.trim().slice(0, 2000),
            appliedDate: appliedDate || Date.now(),
            resume: resume || undefined,
            builtResume: builtResume || undefined,
            review: review || undefined,
        })

        return res.status(201).json({
            success: true,
            message: 'Application added',
            application,
        })
    } catch (error) {
        (req.log || logger).error('create application failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while adding the application',
        })
    }
}

// GET /applications — the whole board sir, newest first within each column
exports.getApplications = async (req, res) => {
    try {
        const id = req?.User.id

        const applications = await Application.find({ user: id })
            .select('company role status location jobUrl notes appliedDate resume builtResume review createdAt updatedAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            applications,
        })
    } catch (error) {
        (req.log || logger).error('get applications failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your applications',
        })
    }
}

// PATCH /applications/:applicationId — edit any field, including a drag-and-drop status move sir
exports.updateApplication = async (req, res) => {
    try {
        const id = req?.User.id
        const { applicationId } = req.params
        const { company, role, status, location, jobUrl, notes, appliedDate, resume, builtResume, review } = req.body

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application id',
            })
        }

        if (status && !STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status',
            })
        }

        const application = await Application.findOne({ _id: applicationId, user: id })
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            })
        }

        if (typeof company === 'string' && company.trim()) application.company = company.trim().slice(0, 120)
        if (typeof role === 'string' && role.trim()) application.role = role.trim().slice(0, 120)
        if (status) application.status = status
        if (typeof location === 'string') application.location = location.trim().slice(0, 120)
        if (typeof jobUrl === 'string') application.jobUrl = jobUrl.trim().slice(0, 500)
        if (typeof notes === 'string') application.notes = notes.trim().slice(0, 2000)
        if (appliedDate) application.appliedDate = appliedDate
        if (resume !== undefined) {
            if (resume) {
                if (!mongoose.isValidObjectId(resume)) {
                    return res.status(400).json({ success: false, message: 'Invalid resume id' })
                }
                const ownedResume = await Resume.exists({ _id: resume, user: id })
                if (!ownedResume) {
                    return res.status(400).json({ success: false, message: 'Resume not found' })
                }
            }
            application.resume = resume || undefined
        }
        if (builtResume !== undefined) {
            if (builtResume) {
                if (!mongoose.isValidObjectId(builtResume)) {
                    return res.status(400).json({ success: false, message: 'Invalid built resume id' })
                }
                const ownedBuiltResume = await BuiltResume.exists({ _id: builtResume, user: id })
                if (!ownedBuiltResume) {
                    return res.status(400).json({ success: false, message: 'Built resume not found' })
                }
            }
            application.builtResume = builtResume || undefined
        }
        if (review !== undefined) {
            if (review) {
                if (!mongoose.isValidObjectId(review)) {
                    return res.status(400).json({ success: false, message: 'Invalid review id' })
                }
                const owned = await Review.exists({ _id: review, user: id })
                if (!owned) {
                    return res.status(400).json({ success: false, message: 'Review not found' })
                }
            }
            application.review = review || undefined
        }

        await application.save()

        return res.status(200).json({
            success: true,
            message: 'Application updated',
            application,
        })
    } catch (error) {
        (req.log || logger).error('update application failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the application',
        })
    }
}

// DELETE /applications/:applicationId sir
exports.deleteApplication = async (req, res) => {
    try {
        const id = req?.User.id
        const { applicationId } = req.params

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application id',
            })
        }

        const application = await Application.findOneAndDelete({ _id: applicationId, user: id })
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Application deleted',
        })
    } catch (error) {
        (req.log || logger).error('delete application failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the application',
        })
    }
}

// GET /applications/analytics sir — available to every plan, but the depth differs:
//   Basic/Pro: one aggregate number (overall interview/offer rate across ALL applications) —
//              a real, useful stat that costs nothing to compute and doubles as a teaser for
//              the paid feature below
//   ProMax:    the full breakdown, correlating the ATS score of the review actually attached to
//              each application against real outcomes. Only applications with a `review` link
//              are included here — there is no reliable way to auto-infer that link (Review has
//              no ref back to the resume it scored), so THIS view is only as complete as what
//              the user has explicitly tagged, and the frontend should say so rather than imply
//              full coverage. The Basic/Pro number above has no such gap since it needs no link.
exports.getApplicationAnalytics = async (req, res) => {
    try {
        const id = req?.User.id

        const plan = await getUserPlan(id)
        const isProMax = plan?.key === 'ProMax'

        // Basic/Pro teaser sir: one real, useful number (overall interview/offer rate across ALL
        // applications, no review-link required) instead of a plain upgrade ad with zero data.
        // The deeper "which ATS score bucket actually converts" breakdown below stays ProMax-only —
        // that's the paid insight, this is just enough to show the feature is worth paying for.
        if (!isProMax) {
            const totalCount = await Application.countDocuments({ user: id })
            const interviewsOrOffers = await Application.countDocuments({ user: id, status: { $in: ['Interview', 'Offer'] } })
            const overallRate = totalCount > 0 ? Math.round((interviewsOrOffers / totalCount) * 100) : 0

            return res.status(200).json({
                success: true,
                isProMax: false,
                totalCount,
                overallRate,
            })
        }

        const buckets = await Application.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(id), review: { $ne: null } } },
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'review',
                    foreignField: '_id',
                    as: 'reviewDoc',
                },
            },
            { $unwind: '$reviewDoc' },
            {
                $bucket: {
                    groupBy: '$reviewDoc.atsScore',
                    boundaries: [0, 60, 80, 101],
                    default: 'other',
                    output: {
                        total: { $sum: 1 },
                        interviewsOrOffers: {
                            $sum: { $cond: [{ $in: ['$status', ['Interview', 'Offer']] }, 1, 0] },
                        },
                    },
                },
            },
        ])

        const labels = { 0: 'Below 60', 60: '60-79', 80: '80+' }
        const results = buckets
            .filter((b) => b._id !== 'other')
            .map((b) => ({
                scoreRange: labels[b._id] || String(b._id),
                total: b.total,
                interviewRate: b.total > 0 ? Math.round((b.interviewsOrOffers / b.total) * 100) : 0,
            }))

        const linkedCount = results.reduce((sum, b) => sum + b.total, 0)
        const totalCount = await Application.countDocuments({ user: id })

        return res.status(200).json({
            success: true,
            isProMax: true,
            results,
            linkedCount,
            totalCount,
        })
    } catch (error) {
        (req.log || logger).error('get application analytics failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your application analytics',
        })
    }
}
