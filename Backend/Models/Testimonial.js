const mongoose = require('mongoose')

// user-submitted homepage testimonials sir — submitted by any logged-in User, only shown on
// the public homepage once an Admin/Support approves them
const testimonialSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        quote: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        // pending -> approved (shown on homepage) or rejected (kept for the record, never shown) sir
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Testimonial', testimonialSchema)
