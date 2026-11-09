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
        // true only while status is 'pending' or 'approved' sir, per 2026-11-09 audit — the
        // controller's findOne-then-create "one pending/approved testimonial per user" check was
        // a TOCTOU race: two rapid double-submits could both pass the check before either create
        // landed. Mongo's partialFilterExpression only supports $eq/$exists/comparisons, not
        // $in/$or, so this boolean (set in the controller, unset on reject) is what the partial
        // unique index below actually filters on — status itself stays the source of truth for
        // everything else, this is purely the index's own enforcement mechanism.
        activeSubmission: {
            type: Boolean,
        },
    },
    { timestamps: true }
)

// the ACTUAL enforcement sir — see activeSubmission's comment above
testimonialSchema.index(
    { user: 1 },
    { unique: true, partialFilterExpression: { activeSubmission: true } }
)

module.exports = mongoose.model('Testimonial', testimonialSchema)
