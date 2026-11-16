// Mock interview schemas sir — see Models/MockInterview.js and controllers/MockInterview.js.
// startMockInterview also takes a PDF file (req.files.PDf), handled separately by
// validatePdfUpload since multipart file fields aren't covered by this schema.

const { z } = require('zod')
const { jdText } = require('./Shared')

// jdText sir, per 2026-11-16 audit — see Chat.js's own comment, same consolidation
const startMockInterviewSchema = z.object({
    jd: jdText('Job Description'),
})

const answerMockInterviewSchema = z.object({
    answer: z.string({ error: 'An answer is required' }).trim().min(1, 'An answer is required').max(5000, 'Your answer is too long, please keep it under 5000 characters'),
})

module.exports = {
    startMockInterviewSchema,
    answerMockInterviewSchema,
}
