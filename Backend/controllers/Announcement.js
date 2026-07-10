const mongoose = require('mongoose')

const Announcement = require('../Models/Announcement')
const { logAction } = require('../utils/AdminLog')

// broadcast banners sir — admin writes them, the public endpoint serves the live one to every user

// POST /admin/announcements — publish a banner sir, body: { title, message, expiresAt? }
exports.createAnnouncement = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { title, message, expiresAt } = req.body

        if (!title?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required',
            })
        }

        const announcement = await Announcement.create({
            title: title.trim(),
            message: message.trim(),
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the announcements',
        })
    }
}

// PATCH /admin/announcements/:announcementId — flip a banner on/off sir, body: { active: true/false }
exports.toggleAnnouncement = async (req, res) => {
    try {
        const { announcementId } = req.params
        const { active } = req.body

        if (!mongoose.isValidObjectId(announcementId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement id',
            })
        }

        if (typeof active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "'active' must be true or false",
            })
        }

        const announcement = await Announcement.findByIdAndUpdate(
            announcementId,
            { active },
            { new: true }
        )

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: active ? 'Announcement is live' : 'Announcement is off',
            announcement
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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

        // the newest live, non-expired banner sir
        const announcement = await Announcement.findOne({
            active: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        })
            .select('title message createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            announcement // null when there is nothing to show sir
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the announcement',
        })
    }
}
