const Review = require('../Models/Review')

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
