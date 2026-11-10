const mongoose = require('mongoose')

const Testimonial = require('../Models/Testimonial')
const { logAction } = require('../utils/AdminLog')
const { notify } = require('../utils/NotificationLog')
const logger = require('../utils/logger')

// user-submitted homepage testimonials sir — a User submits one, Admin/Support moderates it,
// only 'approved' ones are ever served by the public endpoint

// POST /testimonials — body: { role, quote, rating (1-5) } sir, one pending/approved
// submission per user at a time (a rejected one can be resubmitted)
exports.submitTestimonial = async (req, res) => {
    try {
        const userId = req?.User.id
        // role/quote/rating are already guaranteed valid by submitTestimonialSchema
        // (Validation/Testimonial.js) via the route's validate() middleware sir
        const { role, quote, rating } = req.body

        // pre-check kept for a fast, friendly message sir — the REAL enforcement is
        // Models/Testimonial.js's partial unique index on activeSubmission, added per
        // 2026-11-09 audit after this check alone proved to be a TOCTOU race
        const existing = await Testimonial.findOne({ user: userId, status: { $in: ['pending', 'approved'] } })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.status === 'approved'
                    ? 'You already have an approved testimonial live on the site'
                    : 'You already have a testimonial awaiting review',
            })
        }

        let testimonial
        try {
            testimonial = await Testimonial.create({
                user: userId,
                role,
                quote,
                rating,
                activeSubmission: true,
            })
        } catch (createError) {
            // duplicate-key race sir — the pre-check above can't catch two near-simultaneous
            // submissions; the partial unique index is the real guard. Same 400 the pre-check
            // already gives, instead of a scary 500.
            if (createError.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a testimonial pending or live on the site',
                })
            }
            throw createError
        }

        return res.status(201).json({
            success: true,
            message: 'Thanks! Your testimonial will show up once reviewed.',
            testimonial,
        })
    } catch (error) {
        (req.log || logger).error('submit testimonial failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while submitting your testimonial',
        })
    }
}

// GET /testimonials/mine — a user checking the status of their own submission sir
exports.getMyTestimonial = async (req, res) => {
    try {
        const userId = req?.User.id
        const testimonial = await Testimonial.findOne({ user: userId }).sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            testimonial,
        })
    } catch (error) {
        (req.log || logger).error('get my testimonial failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your testimonial',
        })
    }
}

// GET /admin/testimonials?status=pending — moderation queue sir, newest first
exports.getTestimonials = async (req, res) => {
    try {
        const { status } = req.query
        const filter = status && ['pending', 'approved', 'rejected'].includes(status) ? { status } : {}

        const testimonials = await Testimonial.find(filter)
            .populate('user', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            testimonials,
        })
    } catch (error) {
        (req.log || logger).error('get testimonials failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the testimonials',
        })
    }
}

// PATCH /admin/testimonials/:testimonialId — body: { status: 'approved' | 'rejected' } sir
exports.moderateTestimonial = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { testimonialId } = req.params
        // status is already guaranteed valid by moderateTestimonialSchema
        // (Validation/Testimonial.js) via the route's validate() middleware sir
        const { status } = req.body

        if (!mongoose.isValidObjectId(testimonialId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid testimonial id',
            })
        }

        // activeSubmission unset on rejection sir, per 2026-11-09 audit — a rejected testimonial
        // can be resubmitted (per this file's own top comment), so the partial unique index
        // guarding "one pending/approved at a time" must stop counting this row once rejected.
        // Stays true on approval: an approved testimonial still occupies the user's one slot.
        const testimonial = await Testimonial.findByIdAndUpdate(
            testimonialId,
            status === 'rejected'
                ? { $set: { status, reviewedBy: adminId }, $unset: { activeSubmission: 1 } }
                : { $set: { status, reviewedBy: adminId } },
            { returnDocument: 'after' }
        ).populate('user', 'firstName lastName email')

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found',
            })
        }

        logAction(
            adminId,
            status === 'approved' ? 'TESTIMONIAL_APPROVE' : 'TESTIMONIAL_REJECT',
            testimonial.user,
            { quote: testimonial.quote }
        )

        notify({
            user: testimonial.user,
            type: 'testimonial',
            title: status === 'approved' ? 'Your testimonial is live!' : "Your testimonial wasn't approved",
            message: status === 'approved'
                ? 'Thanks for sharing — your testimonial is now shown on the homepage.'
                : "Your submission wasn't approved for the homepage. You're welcome to submit a new one.",
            link: '/Dashboard/Account',
        })

        return res.status(200).json({
            success: true,
            message: status === 'approved' ? 'Testimonial approved and now live' : 'Testimonial rejected',
            testimonial,
        })
    } catch (error) {
        (req.log || logger).error('moderate testimonial failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the testimonial',
        })
    }
}

// DELETE /admin/testimonials/:testimonialId sir
exports.deleteTestimonial = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { testimonialId } = req.params

        if (!mongoose.isValidObjectId(testimonialId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid testimonial id',
            })
        }

        const testimonial = await Testimonial.findByIdAndDelete(testimonialId)

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found',
            })
        }

        logAction(adminId, 'TESTIMONIAL_DELETE', null, { quote: testimonial.quote })

        return res.status(200).json({
            success: true,
            message: 'Testimonial deleted',
        })
    } catch (error) {
        (req.log || logger).error('delete testimonial failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the testimonial',
        })
    }
}

// GET /testimonials/approved — PUBLIC sir, no auth — the homepage reads this
exports.getApprovedTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ status: 'approved' })
            .populate('user', 'firstName lastName')
            .select('role quote rating user createdAt')
            .sort({ createdAt: -1 })
            .limit(12)

        return res.status(200).json({
            success: true,
            testimonials,
        })
    } catch (error) {
        (req.log || logger).error('get approved testimonials failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the testimonials',
        })
    }
}
