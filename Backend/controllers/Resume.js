const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')

const Resume = require('../Models/Resume')

// POST /resumes — save a parsed resume for reuse sir, no AI call, no credit spent
exports.saveResume = async (req, res) => {
    try {
        const id = req?.User.id

        const PDf = req.files?.PDf
        if (!PDf) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded file must be a PDF or Word document',
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

        const resume = await Resume.create({
            user: id,
            originalFilename: PDf.name,
            label: (req.body.label || PDf.name || 'My resume').trim().slice(0, 80),
            resumeText: result.text,
            isDefault,
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
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the resume',
        })
    }
}
