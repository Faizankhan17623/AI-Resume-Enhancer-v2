// Outreach message schema sir — see Models/OutreachMessage.js and
// controllers/OutreachMessage.js. generateOutreachMessage also takes a PDF file
// (req.files.PDf), handled separately by validatePdfUpload since multipart file fields
// aren't covered by this schema.

const { z } = require('zod')

const generateOutreachMessageSchema = z.object({
    jd: z.string({ error: 'Job Description is required' }).trim().min(1, 'Job Description is required').max(20000, 'Job Description is too long, please keep it under 20000 characters'),
})

module.exports = {
    generateOutreachMessageSchema,
}
