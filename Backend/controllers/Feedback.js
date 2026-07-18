const User = require('../Models/User')
const Feedback = require('../Models/Feedback')

// popup shows on the 1st completed feature use, then every 2nd use after that,
// until the user has submitted both the star rating and the referral score
const shouldShowPopup = (featureUseCount, feedbackSubmitted) => {
    if (feedbackSubmitted) return false
    if (featureUseCount <= 0) return false
    return featureUseCount === 1 || featureUseCount % 2 === 0
}

// GET /feedback/status — the dashboard polls this after any feature completes sir
exports.getFeedbackStatus = async (req, res) => {
    try {
        const id = req?.User.id

        const user = await User.findById(id).select('featureUseCount feedbackSubmitted')
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Account not found',
            })
        }

        return res.status(200).json({
            success: true,
            shouldShow: shouldShowPopup(user.featureUseCount, user.feedbackSubmitted),
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while checking feedback status',
        })
    }
}

// POST /feedback — body: { rating (1-5), referralScore (0-10), reviewText? } sir
// both rating and referralScore are required, that's what stops the popup from nagging again
exports.submitFeedback = async (req, res) => {
    try {
        const id = req?.User.id
        const { rating, referralScore, reviewText } = req.body

        const ratingNum = Number(rating)
        const referralNum = Number(referralScore)

        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a whole number between 1 and 5',
            })
        }

        if (!Number.isInteger(referralNum) || referralNum < 0 || referralNum > 10) {
            return res.status(400).json({
                success: false,
                message: 'Referral score must be a whole number between 0 and 10',
            })
        }

        await Feedback.create({
            user: id,
            rating: ratingNum,
            referralScore: referralNum,
            reviewText: reviewText?.trim()?.slice(0, 1000),
        })

        await User.findByIdAndUpdate(id, { feedbackSubmitted: true })

        return res.status(201).json({
            success: true,
            message: 'Thanks for the feedback!',
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while submitting your feedback',
        })
    }
}
