// Chat schemas sir — see Models/Chat.js and controllers/Chat.js. createChat also takes a PDF
// file (req.files.PDf), handled separately by validatePdfUpload since multipart file fields
// aren't covered by this schema.

const { z } = require('zod')
const { jdText } = require('./Shared')

// jdText sir, per 2026-11-16 audit — this used to hand-roll the identical rule Shared.js's
// jdText() already centralizes (CoverLetter.js/OutreachMessage.js/MockInterview.js all had the
// same copy), exactly the drift risk jdText's own comment says it exists to prevent
const createChatSchema = z.object({
    jd: jdText('Job Description'),
})

const sendChatMessageSchema = z.object({
    message: z.string({ error: 'Message is required' }).trim().min(1, 'Message is required').max(5000),
})

module.exports = {
    createChatSchema,
    sendChatMessageSchema,
}
