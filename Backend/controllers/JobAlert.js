const mongoose = require('mongoose')

const JobAlert = require('../Models/JobAlert')
const logger = require('../utils/logger')

const MAX_ALERTS_PER_USER = 10 // sir — a sane cap, this is a convenience feature, not unbounded storage

// POST /job-alerts sir — candidate saves a search
exports.createJobAlert = async (req, res) => {
    try {
        const userId = req?.User.id
        const { keywords, location, employmentType } = req.body

        const existingCount = await JobAlert.countDocuments({ user: userId })
        if (existingCount >= MAX_ALERTS_PER_USER) {
            return res.status(400).json({
                success: false,
                message: `You can save up to ${MAX_ALERTS_PER_USER} job alerts — remove one before adding another`,
            })
        }

        const alert = await JobAlert.create({ user: userId, keywords, location, employmentType })
        return res.status(201).json({ success: true, message: 'Job alert saved', alert })
    } catch (error) {
        (req.log || logger).error('create job alert failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving this job alert',
        })
    }
}

// GET /job-alerts sir — candidate's own saved alerts, newest first
exports.listJobAlerts = async (req, res) => {
    try {
        const alerts = await JobAlert.find({ user: req.User.id }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, alerts })
    } catch (error) {
        (req.log || logger).error('list job alerts failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading your job alerts',
        })
    }
}

// PATCH /job-alerts/:alertId sir — toggle active on/off, per direct request's "simple" shape
// (no editing the keywords themselves once saved — delete and re-create is simpler than a full
// edit form for a feature this small)
exports.updateJobAlert = async (req, res) => {
    try {
        const userId = req?.User.id
        const { alertId } = req.params
        const { active } = req.body

        if (!mongoose.isValidObjectId(alertId)) {
            return res.status(400).json({ success: false, message: 'Invalid alert id' })
        }

        const alert = await JobAlert.findOneAndUpdate(
            { _id: alertId, user: userId },
            { $set: { active } },
            { returnDocument: 'after' }
        )
        if (!alert) return res.status(404).json({ success: false, message: 'Job alert not found' })

        return res.status(200).json({ success: true, message: 'Job alert updated', alert })
    } catch (error) {
        (req.log || logger).error('update job alert failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating this job alert',
        })
    }
}

// DELETE /job-alerts/:alertId sir
exports.deleteJobAlert = async (req, res) => {
    try {
        const userId = req?.User.id
        const { alertId } = req.params

        if (!mongoose.isValidObjectId(alertId)) {
            return res.status(400).json({ success: false, message: 'Invalid alert id' })
        }

        const alert = await JobAlert.findOneAndDelete({ _id: alertId, user: userId })
        if (!alert) return res.status(404).json({ success: false, message: 'Job alert not found' })

        return res.status(200).json({ success: true, message: 'Job alert removed' })
    } catch (error) {
        (req.log || logger).error('delete job alert failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while removing this job alert',
        })
    }
}
