// Cover letter schemas sir — see Models/CoverLetter.js and controllers/CoverLetter.js.
// generateCoverLetter also takes a PDF file (req.files.PDf), handled separately by
// validatePdfUpload since multipart file fields aren't covered by this schema.

const { z } = require('zod')

const generateCoverLetterSchema = z.object({
    jd: z.string({ error: 'Job Description is required' }).trim().min(1, 'Job Description is required').max(20000, 'Job Description is too long, please keep it under 20000 characters'),
})

module.exports = {
    generateCoverLetterSchema,
}
