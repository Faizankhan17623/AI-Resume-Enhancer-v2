// In-app feedback schema sir — see Models/Feedback.js and controllers/Feedback.js

const { z } = require('zod')

const submitFeedbackSchema = z.object({
    rating: z.coerce.number().int('Rating must be a whole number between 1 and 5').min(1, 'Rating must be a whole number between 1 and 5').max(5, 'Rating must be a whole number between 1 and 5'),
    referralScore: z.coerce.number().int('Referral score must be a whole number between 0 and 10').min(0, 'Referral score must be a whole number between 0 and 10').max(10, 'Referral score must be a whole number between 0 and 10'),
    reviewText: z.string().trim().max(1000).optional(),
})

module.exports = {
    submitFeedbackSchema,
}
