const mongoose = require('mongoose')

const Report = require('../Models/Report')
const { logAction } = require('../utils/AdminLog')

// user-submitted bug reports + feature suggestions sir — any logged-in role can submit
// (unlike Feedback/Testimonial this isn't gated to isUser, an Admin/Support account can
// hit a bug too), Admin/Support triage them from the admin panel

// POST /reports — body: { type: 'bug' | 'feature', title, description } sir
exports.submitReport = async (req, res) => {
    try {
        const userId = req?.User.id
        const { type, title, description } = req.body

        if (!['bug', 'feature'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Type must be 'bug' or 'feature'",
            })
        }

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are both required',
            })
        }

        const report = await Report.create({
            user: userId,
            type,
            title: title.trim().slice(0, 150),
            description: description.trim().slice(0, 2000),
        })

        return res.status(201).json({
            success: true,
            message: type === 'bug'
                ? 'Thanks for the report! Our team will look into it.'
                : 'Thanks for the suggestion! We\'ll consider it for a future update.',
            report,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while submitting your report',
        })
    }
}

// GET /reports/mine sir — a user checking their own submission history
exports.getMyReports = async (req, res) => {
    try {
        const userId = req?.User.id
        const reports = await Report.find({ user: userId }).sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            reports,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your reports',
        })
    }
}

// GET /admin/reports?type=bug&status=open sir — triage queue, newest first
exports.getReports = async (req, res) => {
    try {
        const { type, status } = req.query
        const filter = {}
        if (type && ['bug', 'feature'].includes(type)) filter.type = type
        if (status && ['open', 'in_progress', 'planned', 'resolved', 'declined'].includes(status)) filter.status = status

        const reports = await Report.find(filter)
            .populate('user', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            reports,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the reports',
        })
    }
}

// PATCH /admin/reports/:reportId sir — body: { status, adminNote? }
exports.updateReportStatus = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { reportId } = req.params
        const { status, adminNote } = req.body

        if (!mongoose.isValidObjectId(reportId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid report id',
            })
        }

        if (!['open', 'in_progress', 'planned', 'resolved', 'declined'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status',
            })
        }

        const report = await Report.findByIdAndUpdate(
            reportId,
            { status, reviewedBy: adminId, ...(adminNote !== undefined && { adminNote: adminNote?.trim()?.slice(0, 1000) }) },
            { new: true }
        ).populate('user', 'firstName lastName email')

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found',
            })
        }

        logAction(adminId, 'REPORT_STATUS_CHANGE', report.user, { reportId: report._id, status, title: report.title })

        return res.status(200).json({
            success: true,
            message: 'Report updated',
            report,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the report',
        })
    }
}

// DELETE /admin/reports/:reportId sir
exports.deleteReport = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { reportId } = req.params

        if (!mongoose.isValidObjectId(reportId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid report id',
            })
        }

        const report = await Report.findByIdAndDelete(reportId)

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found',
            })
        }

        logAction(adminId, 'REPORT_DELETE', null, { reportId: report._id, title: report.title })

        return res.status(200).json({
            success: true,
            message: 'Report deleted',
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the report',
        })
    }
}
