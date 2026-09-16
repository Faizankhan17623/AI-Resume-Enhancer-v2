const mongoose = require('mongoose')

const CannedResponse = require('../Models/CannedResponse')
const logger = require('../utils/logger')

// GET /admin/canned-responses sir — Admin AND Support can read (isSupport gate at the route),
// only Admin can write (see the three exports below)
exports.listCannedResponses = async (req, res) => {
    try {
        const responses = await CannedResponse.find().sort({ title: 1 })
        return res.status(200).json({ success: true, responses })
    } catch (error) {
        (req.log || logger).error('list canned responses failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading canned responses',
        })
    }
}

// POST /admin/canned-responses sir — Admin-only
exports.createCannedResponse = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { title, body } = req.body

        const response = await CannedResponse.create({ title, body, createdBy: adminId })
        return res.status(201).json({ success: true, message: 'Canned response saved', response })
    } catch (error) {
        (req.log || logger).error('create canned response failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving this canned response',
        })
    }
}

// PATCH /admin/canned-responses/:responseId sir — Admin-only
exports.updateCannedResponse = async (req, res) => {
    try {
        const { responseId } = req.params
        const { title, body } = req.body

        if (!mongoose.isValidObjectId(responseId)) {
            return res.status(400).json({ success: false, message: 'Invalid response id' })
        }

        const update = {}
        if (title !== undefined) update.title = title
        if (body !== undefined) update.body = body

        const response = await CannedResponse.findByIdAndUpdate(responseId, update, { returnDocument: 'after' })
        if (!response) {
            return res.status(404).json({ success: false, message: 'Canned response not found' })
        }

        return res.status(200).json({ success: true, message: 'Canned response updated', response })
    } catch (error) {
        (req.log || logger).error('update canned response failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating this canned response',
        })
    }
}

// DELETE /admin/canned-responses/:responseId sir — Admin-only
exports.deleteCannedResponse = async (req, res) => {
    try {
        const { responseId } = req.params

        if (!mongoose.isValidObjectId(responseId)) {
            return res.status(400).json({ success: false, message: 'Invalid response id' })
        }

        const response = await CannedResponse.findByIdAndDelete(responseId)
        if (!response) {
            return res.status(404).json({ success: false, message: 'Canned response not found' })
        }

        return res.status(200).json({ success: true, message: 'Canned response removed' })
    } catch (error) {
        (req.log || logger).error('delete canned response failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while removing this canned response',
        })
    }
}
