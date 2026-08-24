const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')

const Resume = require('../Models/Resume')
const { checkAtsFormatting } = require('../utils/atsFormatCheck')
const { validatePdfUpload } = require('../utils/pdfUpload')
const logger = require('../utils/logger')

// POST /resumes — save a parsed resume for reuse sir, no AI call, no credit spent
exports.saveResume = async (req, res) => {
    try {
        const id = req?.User.id

        const PDf = req.files?.PDf
        const uploadError = validatePdfUpload(PDf)
        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError,
            })
        }

        const parser = new PDFParse({ data: PDf.data })
        const result = await parser.getText()

        if (!result?.text) {
            return res.status(400).json({
                success: false,
                message: 'error in getting the result from the pdf',
            })
        }

        const existingCount = await Resume.countDocuments({ user: id })
        // first saved resume becomes the default automatically sir
        const isDefault = existingCount === 0

        // structural ATS parse-safety scan sir — done once here so every future review that
        // reuses this saved resume gets it for free instead of re-scanning the PDF each time
        let formattingCheck = null
        try {
            formattingCheck = await checkAtsFormatting(PDf.data)
        } catch (fmtErr) {
            (req.log || logger).error('ATS formatting check failed', { err: fmtErr })
        }

        const resume = await Resume.create({
            user: id,
            originalFilename: PDf.name,
            label: (req.body.label || PDf.name || 'My resume').trim().slice(0, 80),
            resumeText: result.text,
            isDefault,
            formattingCheck,
        })

        return res.status(201).json({
            success: true,
            message: 'Resume saved successfully',
            resume: {
                _id: resume._id,
                label: resume.label,
                originalFilename: resume.originalFilename,
                isDefault: resume.isDefault,
                createdAt: resume.createdAt,
                formattingCheck: resume.formattingCheck,
            },
        })
    } catch (error) {
        (req.log || logger).error('label failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving the resume',
        })
    }
}

// GET /resumes — the user's saved resume library sir, newest first
// text stays out of the list payload sir — it can be large, and the picker only needs the label
exports.getResumes = async (req, res) => {
    try {
        const id = req?.User.id

        const resumes = await Resume.find({ user: id })
            .select('label originalFilename isDefault createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            resumes,
        })
    } catch (error) {
        (req.log || logger).error('get resumes failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your resumes',
        })
    }
}

// PATCH /resumes/:resumeId — rename or set as default sir
exports.updateResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { resumeId } = req.params
        const { label, isDefault } = req.body

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resume id',
            })
        }

        const resume = await Resume.findOne({ _id: resumeId, user: id })
        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        if (typeof label === 'string' && label.trim()) {
            resume.label = label.trim().slice(0, 80)
        }

        // only one default per user sir — flip everyone else off first
        if (isDefault === true) {
            await Resume.updateMany({ user: id, _id: { $ne: resume._id } }, { isDefault: false })
            resume.isDefault = true
        } else if (isDefault === false && resume.isDefault) {
            // explicitly unsetting the CURRENT default sir — the frontend never sends this today
            // (Resumes.jsx only ever calls SetDefaultResume to turn one ON), but this endpoint is
            // general PATCH surface, not UI-only, so it must not silently leave the user with zero
            // default resumes. Same promotion logic as deleteResume below: hand the default to the
            // next most recent OTHER resume, if one exists.
            resume.isDefault = false
            const next = await Resume.findOne({ user: id, _id: { $ne: resume._id } }).sort({ createdAt: -1 })
            if (next) {
                next.isDefault = true
                await next.save()
            }
        }

        await resume.save()

        return res.status(200).json({
            success: true,
            message: 'Resume updated successfully',
            resume: {
                _id: resume._id,
                label: resume.label,
                originalFilename: resume.originalFilename,
                isDefault: resume.isDefault,
                createdAt: resume.createdAt,
            },
        })
    } catch (error) {
        (req.log || logger).error('update resume failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the resume',
        })
    }
}

// DELETE /resumes/:resumeId sir
exports.deleteResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { resumeId } = req.params

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resume id',
            })
        }

        const resume = await Resume.findOneAndDelete({ _id: resumeId, user: id })
        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        // promote the most recent remaining resume to default sir, if the deleted one was it
        if (resume.isDefault) {
            const next = await Resume.findOne({ user: id }).sort({ createdAt: -1 })
            if (next) {
                next.isDefault = true
                await next.save()
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Resume deleted successfully',
        })
    } catch (error) {
        (req.log || logger).error('delete resume failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the resume',
        })
    }
}
