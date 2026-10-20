// Saved job alert schemas sir — see Models/JobAlert.js

const { z } = require('zod')

const createJobAlertSchema = z.object({
    keywords: z.string({ error: 'Keywords are required' }).trim().min(1, 'Keywords are required').max(200),
    location: z.string().trim().max(150).optional(),
    employmentType: z.string().trim().max(50).optional(),
})

const updateJobAlertSchema = z.object({
    active: z.boolean().optional(),
})

module.exports = {
    createJobAlertSchema,
    updateJobAlertSchema,
}
