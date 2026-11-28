// Announcement schemas sir — see Models/Announcement.js and controllers/Announcement.js.
// Deliberately narrow: this only guarantees the TYPE shape (string/boolean/date-ish) before the
// controller runs, per 2026-11-28 audit — title.trim()/message.trim() used to assume strings and
// threw a 500 on e.g. title:123. The actual scheduling-window business rule (startsAt/expiresAt
// must be tomorrow or later) stays in controllers/Announcement.js's own validateSchedule, since
// it's relative to "now" at request time, not a fixed shape a schema should duplicate.

const { z } = require('zod')

const createAnnouncementSchema = z.object({
    title: z.string({ error: 'Title and message are both required' }).trim().min(1, 'Title and message are both required').max(100),
    message: z.string({ error: 'Title and message are both required' }).trim().min(1, 'Title and message are both required').max(500),
    active: z.boolean().optional(),
    startsAt: z.coerce.date({ error: 'Invalid start date/time' }).optional(),
    expiresAt: z.coerce.date({ error: 'Invalid end date/time' }).optional(),
})

const updateAnnouncementSchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(100).optional(),
    message: z.string().trim().min(1, 'Message is required').max(500).optional(),
    active: z.boolean().optional(),
    startsAt: z.coerce.date({ error: 'Invalid start date/time' }).optional(),
    expiresAt: z.coerce.date({ error: 'Invalid end date/time' }).optional(),
})

module.exports = {
    createAnnouncementSchema,
    updateAnnouncementSchema,
}
