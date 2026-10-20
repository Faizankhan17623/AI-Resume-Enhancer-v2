// Recruiter self-signup application schemas sir — see User.recruiterApplication

const { z } = require('zod')
const { companySize } = require('./Shared')

// every field here is required sir — the Admin's approval judgment call (see
// approveRecruiterApplication) depends on having company name, website, size, location, and
// hiring needs up front, not a half-filled request
const recruiterApplicationSchema = z.object({
    companyName: z.string({ error: 'Company name is required' }).trim().min(1, 'Company name is required').max(150),
    companyWebsite: z.string({ error: 'Company website is required' }).trim().min(1, 'Company website is required').max(300)
        .refine((v) => /^https?:\/\/.+\..+/i.test(v), 'Please enter a valid website URL (e.g. https://example.com)'),
    companySize,
    location: z.string({ error: 'Location is required' }).trim().min(1, 'Location is required').max(150),
    hiringNeeds: z.string({ error: 'Please tell us your hiring needs' }).trim().min(1, 'Please tell us your hiring needs').max(2000),
})

const rejectRecruiterApplicationSchema = z.object({
    reason: z.string().trim().max(500).optional(),
})

module.exports = {
    recruiterApplicationSchema,
    rejectRecruiterApplicationSchema,
}
