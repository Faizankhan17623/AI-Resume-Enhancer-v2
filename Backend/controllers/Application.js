const mongoose = require('mongoose')
const Application = require('../Models/Application')

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected']

// POST /applications — add a card to the tracker sir, no AI call, no credit spent
exports.createApplication = async (req, res) => {
    try {
        const id = req?.User.id
        const { company, role, status, location, jobUrl, notes, appliedDate, resume, builtResume } = req.body

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

        if (resume && !mongoose.isValidObjectId(resume)) {
            return res.status(400).json({ success: false, message: 'Invalid resume id' })
        }
        if (builtResume && !mongoose.isValidObjectId(builtResume)) {
            return res.status(400).json({ success: false, message: 'Invalid built resume id' })
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
        })

        return res.status(201).json({
            success: true,
            message: 'Application added',
            application,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
            .select('company role status location jobUrl notes appliedDate resume builtResume createdAt updatedAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            applications,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        const { company, role, status, location, jobUrl, notes, appliedDate, resume, builtResume } = req.body

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
            if (resume && !mongoose.isValidObjectId(resume)) {
                return res.status(400).json({ success: false, message: 'Invalid resume id' })
            }
            application.resume = resume || undefined
        }
        if (builtResume !== undefined) {
            if (builtResume && !mongoose.isValidObjectId(builtResume)) {
                return res.status(400).json({ success: false, message: 'Invalid built resume id' })
            }
            application.builtResume = builtResume || undefined
        }

        await application.save()

        return res.status(200).json({
            success: true,
            message: 'Application updated',
            application,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the application',
        })
    }
}
