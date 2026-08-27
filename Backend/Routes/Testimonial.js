const express = require('express')
const route = express.Router()
const { Auth, isUserOrRecruiter, isSupport, isAdmin } = require('../Middlewares/Auth.js')
const { adminWriteLimiter, adminReadLimiter, testimonialLimiter } = require('../Middlewares/RateLimit.js')
const {
    submitTestimonial,
    getMyTestimonial,
    getTestimonials,
    moderateTestimonial,
    deleteTestimonial,
    getApprovedTestimonials,
} = require('../controllers/Testimonial.js')

// user-facing sir — both a candidate and a Recruiter can share a story; Admin/Support still blocked
route.post('/testimonials', Auth, isUserOrRecruiter, testimonialLimiter, submitTestimonial)
route.get('/testimonials/mine', Auth, isUserOrRecruiter, getMyTestimonial)

// moderation sir — Support can view the queue, only Admin can approve/reject/delete
route.get('/admin/testimonials', Auth, isSupport, adminReadLimiter, getTestimonials)
route.patch('/admin/testimonials/:testimonialId', Auth, isAdmin, adminWriteLimiter, moderateTestimonial)
route.delete('/admin/testimonials/:testimonialId', Auth, isAdmin, adminWriteLimiter, deleteTestimonial)

// public sir — the homepage reads this, no login needed
route.get('/testimonials/approved', getApprovedTestimonials)

module.exports = route
