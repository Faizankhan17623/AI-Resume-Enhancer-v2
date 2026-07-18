const User = require('../Models/User')

// recordFeatureUse(userId) sir — call this right after any feature completes successfully
// (review, chat, cover letter, job search). Drives the feedback popup cadence, separate
// from the daily activity streak. Same fire-and-forget rule as updateStreak: swallow errors,
// never break the real request.
const recordFeatureUse = async (userId) => {
    try {
        await User.findByIdAndUpdate(userId, { $inc: { featureUseCount: 1 } })
    } catch (err) {
        console.log('feature use tracking failed:', err.message)
    }
}

module.exports = { recordFeatureUse }
