// Chat schemas sir — see Models/Chat.js and controllers/Chat.js. createChat also takes a PDF
// file (req.files.PDf), handled separately by validatePdfUpload since multipart file fields
// aren't covered by this schema.

const { z } = require('zod')

const createChatSchema = z.object({
    jd: z.string({ error: 'Job Description is required' }).trim().min(1, 'Job Description is required').max(20000, 'Job Description is too long, please keep it under 20000 characters'),
})

const sendChatMessageSchema = z.object({
    message: z.string({ error: 'Message is required' }).trim().min(1, 'Message is required').max(5000),
})

module.exports = {
    createChatSchema,
    sendChatMessageSchema,
}
