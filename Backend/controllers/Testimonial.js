const mongoose = require('mongoose')

const Testimonial = require('../Models/Testimonial')
const { logAction } = require('../utils/AdminLog')

// user-submitted homepage testimonials sir — a User submits one, Admin/Support moderates it,
// only 'approved' ones are ever served by the public endpoint

// POST /testimonials — body: { role, quote, rating (1-5) } sir, one pending/approved
// submission per user at a time (a rejected one can be resubmitted)
exports.submitTestimonial = async (req, res) => {
    try {
        const userId = req?.User.id
        const { role, quote, rating } = req.body

        if (!role?.trim() || !quote?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Role and quote are both required',
            })
        }

        const ratingNum = Number(rating)
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a whole number between 1 and 5',
            })
        }

        const existing = await Testimonial.findOne({ user: userId, status: { $in: ['pending', 'approved'] } })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.status === 'approved'
                    ? 'You already have an approved testimonial live on the site'
                    : 'You already have a testimonial awaiting review',
            })
        }

        const testimonial = await Testimonial.create({
            user: userId,
            role: role.trim().slice(0, 100),
            quote: quote.trim().slice(0, 500),
            rating: ratingNum,
        })

        return res.status(201).json({
            success: true,
            message: 'Thanks! Your testimonial will show up once reviewed.',
            testimonial,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        const { status } = req.body

        if (!mongoose.isValidObjectId(testimonialId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid testimonial id',
            })
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be 'approved' or 'rejected'",
            })
        }

        const testimonial = await Testimonial.findByIdAndUpdate(
            testimonialId,
            { status, reviewedBy: adminId },
            { new: true }
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

        return res.status(200).json({
            success: true,
            message: status === 'approved' ? 'Testimonial approved and now live' : 'Testimonial rejected',
            testimonial,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the testimonials',
        })
    }
}
