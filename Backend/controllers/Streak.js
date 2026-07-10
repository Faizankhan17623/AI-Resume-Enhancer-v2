const User = require('../Models/User')

// GET /streak — the current user's activity streak sir, for the dashboard badge
exports.getStreak = async (req, res) => {
    try {
        const id = req?.User.id

        const user = await User.findById(id).select('currentStreak longestStreak lastActivityDate')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        return res.status(200).json({
            success: true,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            lastActivityDate: user.lastActivityDate,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the streak',
        })
    }
}
