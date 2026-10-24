// Recruiter-candidate messaging schemas sir — see Models/MessageThread.js

const { z } = require('zod')

const sendMessageSchema = z.object({
    text: z.string({ error: 'A message is required' }).trim().min(1, 'A message is required').max(2000),
})

module.exports = {
    sendMessageSchema,
}
