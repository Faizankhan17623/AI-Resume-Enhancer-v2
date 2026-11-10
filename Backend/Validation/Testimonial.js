// Testimonial schemas sir — see Models/Testimonial.js and controllers/Testimonial.js

const { z } = require('zod')

const submitTestimonialSchema = z.object({
    role: z.string({ error: 'Role and quote are both required' }).trim().min(1, 'Role and quote are both required').max(100),
    quote: z.string({ error: 'Role and quote are both required' }).trim().min(1, 'Role and quote are both required').max(500),
    rating: z.coerce.number().int('Rating must be a whole number between 1 and 5').min(1, 'Rating must be a whole number between 1 and 5').max(5, 'Rating must be a whole number between 1 and 5'),
})

const moderateTestimonialSchema = z.object({
    status: z.enum(['approved', 'rejected'], { error: "Status must be 'approved' or 'rejected'" }),
})

module.exports = {
    submitTestimonialSchema,
    moderateTestimonialSchema,
}
