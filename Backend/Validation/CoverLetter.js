// Cover letter schemas sir — see Models/CoverLetter.js and controllers/CoverLetter.js.
// generateCoverLetter also takes a PDF file (req.files.PDf), handled separately by
// validatePdfUpload since multipart file fields aren't covered by this schema.

const { z } = require('zod')
const { jdText } = require('./Shared')

// jdText sir, per 2026-11-16 audit — see Chat.js's own comment, same consolidation
const generateCoverLetterSchema = z.object({
    jd: jdText('Job Description'),
})

module.exports = {
    generateCoverLetterSchema,
}
