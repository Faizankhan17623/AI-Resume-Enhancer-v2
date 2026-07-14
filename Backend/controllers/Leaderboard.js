const Review = require('../Models/Review')
const User = require('../Models/User')

// shared shape sir — every board is anonymized the same way, index-based labels, no user field ever returned
const anonymize = (rows, valueKey, id) =>
    rows.map((row, index) => ({
        rank: index + 1,
        label: `Anonymous #${index + 1}`,
        value: row[valueKey],
        isYou: String(row._id) === String(id),
    }))

// GET /leaderboard — anonymized top ATS scores sir, no resume content, no identity leaked
// each user's best-ever score counts once, so repeat reviewers don't flood the board
exports.getLeaderboard = async (req, res) => {
    try {
        const id = req?.User.id

        const rows = await Review.aggregate([
            { $group: { _id: '$user', bestScore: { $max: '$atsScore' } } },
            { $sort: { bestScore: -1 } },
            { $limit: 50 },
        ])

        // index-based anonymous labels sir — no user field is ever populated here
        const leaderboard = rows.map((row, index) => ({
            rank: index + 1,
            label: `Anonymous #${index + 1}`,
            bestScore: row.bestScore,
            isYou: String(row._id) === String(id),
        }))

        return res.status(200).json({
            success: true,
            leaderboard,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the leaderboard',
        })
    }
}

// GET /leaderboard/weekly-reviews — who ran the most reviews in the last 7 days sir
// counts every review a user ran this week, not just their best one — this board rewards activity, not skill
exports.getWeeklyReviewsLeaderboard = async (req, res) => {
    try {
        const id = req?.User.id
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const rows = await Review.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: '$user', reviewCount: { $sum: 1 } } },
            { $sort: { reviewCount: -1 } },
            { $limit: 50 },
        ])

        return res.status(200).json({
            success: true,
            leaderboard: anonymize(rows, 'reviewCount', id),
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the weekly reviews leaderboard',
        })
    }
}

// GET /leaderboard/streaks — longest current activity streaks sir
// currentStreak is live on the User doc already (bumped by utils/Streak.js), no aggregation needed
exports.getStreaksLeaderboard = async (req, res) => {
    try {
        const id = req?.User.id

        const rows = await User.find({ currentStreak: { $gt: 0 } })
            .select('currentStreak')
            .sort({ currentStreak: -1 })
            .limit(50)

        const leaderboard = anonymize(
            rows.map((u) => ({ _id: u._id, currentStreak: u.currentStreak })),
            'currentStreak',
            id
        )

        return res.status(200).json({
            success: true,
            leaderboard,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the streaks leaderboard',
        })
    }
}
