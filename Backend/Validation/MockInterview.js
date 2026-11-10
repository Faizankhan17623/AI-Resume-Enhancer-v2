// Mock interview schemas sir — see Models/MockInterview.js and controllers/MockInterview.js.
// startMockInterview also takes a PDF file (req.files.PDf), handled separately by
// validatePdfUpload since multipart file fields aren't covered by this schema.

const { z } = require('zod')

const startMockInterviewSchema = z.object({
    jd: z.string({ error: 'Job Description is required' }).trim().min(1, 'Job Description is required').max(20000, 'Job Description is too long, please keep it under 20000 characters'),
})

const answerMockInterviewSchema = z.object({
    answer: z.string({ error: 'An answer is required' }).trim().min(1, 'An answer is required').max(5000, 'Your answer is too long, please keep it under 5000 characters'),
})

module.exports = {
    startMockInterviewSchema,
    answerMockInterviewSchema,
}
