const express = require('express')
const route = express.Router()
const { Auth, isUser, isSupport, isAdmin } = require('../Middlewares/Auth.js')
const { adminWriteLimiter, adminReadLimiter, testimonialLimiter } = require('../Middlewares/RateLimit.js')
const {
    submitTestimonial,
    getMyTestimonial,
    getTestimonials,
    moderateTestimonial,
    deleteTestimonial,
    getApprovedTestimonials,
} = require('../controllers/Testimonial.js')

// user-facing sir — isUser blocks Admin/Support too, same as Feedback
route.post('/testimonials', Auth, isUser, testimonialLimiter, submitTestimonial)
route.get('/testimonials/mine', Auth, isUser, getMyTestimonial)

// moderation sir — Support can view the queue, only Admin can approve/reject/delete
route.get('/admin/testimonials', Auth, isSupport, adminReadLimiter, getTestimonials)
route.patch('/admin/testimonials/:testimonialId', Auth, isAdmin, adminWriteLimiter, moderateTestimonial)
route.delete('/admin/testimonials/:testimonialId', Auth, isAdmin, adminWriteLimiter, deleteTestimonial)

// public sir — the homepage reads this, no login needed
route.get('/testimonials/approved', getApprovedTestimonials)

module.exports = route
