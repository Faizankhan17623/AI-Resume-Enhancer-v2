// Canned response schemas sir — see Models/CannedResponse.js

const { z } = require('zod')

const createCannedResponseSchema = z.object({
    title: z.string({ error: 'A title is required' }).trim().min(1, 'A title is required').max(100),
    body: z.string({ error: 'A body is required' }).trim().min(1, 'A body is required').max(2000),
})

const updateCannedResponseSchema = z.object({
    title: z.string().trim().min(1).max(100).optional(),
    body: z.string().trim().min(1).max(2000).optional(),
})

module.exports = {
    createCannedResponseSchema,
    updateCannedResponseSchema,
}
