// Resume library schema sir — see Models/Resume.js and controllers/Resume.js. saveResume takes
// only a PDF file (req.files.PDf), no body text field, so it has no schema here.

const { z } = require('zod')

const updateResumeSchema = z.object({
    // an empty string is allowed through here and is a no-op in the controller (same behavior
    // as before this schema existed), not rejected sir — only the max length is a hard rule
    label: z.string().trim().max(80).optional(),
    isDefault: z.boolean().optional(),
})

module.exports = {
    updateResumeSchema,
}
