const mongoose = require('mongoose')
const logger = require('../utils/logger')

const Announcement = require('../Models/Announcement')
const { logAction } = require('../utils/AdminLog')

// broadcast banners sir — admin writes them, the public endpoint serves the live one to every user

const MAX_ACTIVE = 2
const MAX_WINDOW_DAYS = 15
const MS_PER_DAY = 24 * 60 * 60 * 1000

// only 2 announcements can be live at once sir — excludeId lets an already-active one re-save itself
const assertActiveSlotAvailable = async (excludeId) => {
    const filter = { active: true }
    if (excludeId) filter._id = { $ne: excludeId }
    const activeCount = await Announcement.countDocuments(filter)
    if (activeCount >= MAX_ACTIVE) {
        const err = new Error('Only 2 announcements can be active at once — turn one off first')
        err.statusCode = 400
        throw err
    }
}

// startsAt must be tomorrow or later (IST-aware "tomorrow" is a UI concern; here we just
// require strictly-future by at least one day-ish margin) and the start->end gap can't
// exceed 15 days sir. Returns null on success, or an error message string.
const validateSchedule = (startsAt, expiresAt) => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + MS_PER_DAY)

    if (startsAt) {
        const start = new Date(startsAt)
        if (Number.isNaN(start.getTime())) return 'Invalid start date/time'
        if (start < tomorrow) return 'Start date/time must be tomorrow or later'
    }

    if (expiresAt) {
        const end = new Date(expiresAt)
        if (Number.isNaN(end.getTime())) return 'Invalid end date/time'
        if (end < tomorrow) return 'End date/time must be tomorrow or later'
    }

    if (startsAt && expiresAt) {
        const start = new Date(startsAt)
        const end = new Date(expiresAt)
        if (end <= start) return 'End date/time must be after the start date/time'
        if (end.getTime() - start.getTime() > MAX_WINDOW_DAYS * MS_PER_DAY) {
            return `The gap between start and end can't exceed ${MAX_WINDOW_DAYS} days`
        }
    }

    return null
}

// POST /admin/announcements — publish a banner sir, body: { title, message, active?, startsAt?, expiresAt? }
exports.createAnnouncement = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { title, message, expiresAt, startsAt } = req.body
        const active = typeof req.body.active === 'boolean' ? req.body.active : true

        if (!title?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required',
            })
        }

        const scheduleError = validateSchedule(startsAt, expiresAt)
        if (scheduleError) {
            return res.status(400).json({ success: false, message: scheduleError })
        }

        if (active) {
            await assertActiveSlotAvailable()
        }

        const announcement = await Announcement.create({
            title: title.trim(),
            message: message.trim(),
            active,
            startsAt: startsAt ? new Date(startsAt) : undefined,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdBy: adminId,
        })

        logAction(adminId, 'ANNOUNCEMENT_CREATE', null, { title: announcement.title })

        return res.status(201).json({
            success: true,
            message: 'Announcement published',
            announcement
        })
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message })
        }
        (req.log || logger).error('create announcement failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the announcement',
        })
    }
}

// GET /admin/announcements — all banners, newest first sir
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            announcements
        })
    } catch (error) {
        (req.log || logger).error('get announcements failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the announcements',
        })
    }
}

// PATCH /admin/announcements/:announcementId — partial update sir, body: any of
// { title?, message?, active?, startsAt?, expiresAt? }. Also used for the plain toggle
// on/off button, which just sends { active }.
exports.updateAnnouncement = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { announcementId } = req.params
        const { title, message, active, startsAt, expiresAt } = req.body

        if (!mongoose.isValidObjectId(announcementId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement id',
            })
        }

        const existing = await Announcement.findById(announcementId)
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found',
            })
        }

        const changes = {}

        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({ success: false, message: 'Title is required' })
            }
            changes.title = title.trim()
        }

        if (message !== undefined) {
            if (!message.trim()) {
                return res.status(400).json({ success: false, message: 'Message is required' })
            }
            changes.message = message.trim()
        }

        if (active !== undefined) {
            if (typeof active !== 'boolean') {
                return res.status(400).json({ success: false, message: "'active' must be true or false" })
            }
            changes.active = active
        }

        if (startsAt !== undefined) changes.startsAt = startsAt ? new Date(startsAt) : null
        if (expiresAt !== undefined) changes.expiresAt = expiresAt ? new Date(expiresAt) : null

        // validate the schedule using whichever value wins (edited or existing) sir
        const effectiveStart = startsAt !== undefined ? changes.startsAt : existing.startsAt
        const effectiveEnd = expiresAt !== undefined ? changes.expiresAt : existing.expiresAt
        const scheduleError = validateSchedule(effectiveStart, effectiveEnd)
        if (scheduleError) {
            return res.status(400).json({ success: false, message: scheduleError })
        }

        // only re-check the 2-active cap when this request actually turns it ON sir
        if (active === true && !existing.active) {
            await assertActiveSlotAvailable(announcementId)
        }

        const announcement = await Announcement.findByIdAndUpdate(
            announcementId,
            changes,
            { returnDocument: 'after' }
        )

        logAction(adminId, 'ANNOUNCEMENT_UPDATE', announcement, { changes })

        return res.status(200).json({
            success: true,
            message: active !== undefined ? (active ? 'Announcement is live' : 'Announcement is off') : 'Announcement updated',
            announcement
        })
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message })
        }
        (req.log || logger).error('update announcement failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the announcement',
        })
    }
}

// DELETE /admin/announcements/:announcementId — remove a banner for good sir
exports.deleteAnnouncement = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { announcementId } = req.params

        if (!mongoose.isValidObjectId(announcementId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement id',
            })
        }

        const announcement = await Announcement.findByIdAndDelete(announcementId)

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found',
            })
        }

        logAction(adminId, 'ANNOUNCEMENT_DELETE', null, { title: announcement.title })

        return res.status(200).json({
            success: true,
            message: 'Announcement deleted',
        })
    } catch (error) {
        (req.log || logger).error('delete announcement failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the announcement',
        })
    }
}

// GET /announcements/active — PUBLIC sir, no auth — the frontend banner reads this
exports.getActiveAnnouncement = async (req, res) => {
    try {
        const now = new Date()

        // the newest live banner that has started (or has no scheduled start) and hasn't
        // expired (or has no expiry) sir
        const announcement = await Announcement.findOne({
            active: true,
            $and: [
                { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
                { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] },
            ],
        })
            .select('title message createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            announcement // null when there is nothing to show sir
        })
    } catch (error) {
        (req.log || logger).error('get active announcement failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the announcement',
        })
    }
}
