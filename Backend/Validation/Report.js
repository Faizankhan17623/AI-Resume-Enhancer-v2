// Bug/feature report schemas sir — see Models/Report.js and controllers/Report.js

const { z } = require('zod')

const submitReportSchema = z.object({
    type: z.enum(['bug', 'feature'], { error: "Type must be 'bug' or 'feature'" }),
    title: z.string({ error: 'Title and description are both required' }).trim().min(1, 'Title and description are both required').max(150),
    description: z.string({ error: 'Title and description are both required' }).trim().min(1, 'Title and description are both required').max(2000),
})

const updateReportStatusSchema = z.object({
    status: z.enum(['open', 'in_progress', 'planned', 'resolved', 'declined'], { error: 'Invalid status' }),
    adminNote: z.string().trim().max(1000).optional(),
})

module.exports = {
    submitReportSchema,
    updateReportStatusSchema,
}
