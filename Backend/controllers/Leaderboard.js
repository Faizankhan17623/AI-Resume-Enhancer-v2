const Review = require('../Models/Review')
const logger = require('../utils/logger')
const User = require('../Models/User')

// shared shape sir — every board now shows each user's real full name instead of an
// "Anonymous #N" label (an explicit product decision — this used to be deliberately
// anonymized, "no identity leaked"; the user asked for real names on all three boards instead).
// nameById is a Map of userId -> "First Last" sir, built once per request by whichever caller
// needs it (see fetchNames below) so this stays a pure formatting step with no DB access of its
// own — a user deleted between the aggregation and this map lookup just falls back to a plain
// placeholder rather than crashing the whole board.
const withNames = (rows, valueKey, id, nameById) =>
    rows.map((row, index) => ({
        rank: index + 1,
        label: nameById.get(String(row._id)) || 'Deleted user',
        value: row[valueKey],
        isYou: String(row._id) === String(id),
    }))

// one shared name lookup sir — takes the list of user ids a board's aggregation already
// resolved to, fetches firstName+lastName for exactly those ids in one query, and returns a
// Map for O(1) lookup while formatting each row above
const fetchNames = async (userIds) => {
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName')
    return new Map(users.map((u) => [String(u._id), `${u.firstName} ${u.lastName}`]))
}

// GET /leaderboard — top ATS scores sir, real names, no resume content shown
// each user's best-ever score counts once, so repeat reviewers don't flood the board
exports.getLeaderboard = async (req, res) => {
    try {
        const id = req?.User.id

        const rows = await Review.aggregate([
            { $group: { _id: '$user', bestScore: { $max: '$atsScore' } } },
            { $sort: { bestScore: -1 } },
            { $limit: 50 },
        ])

        const nameById = await fetchNames(rows.map((row) => row._id))
        const leaderboard = rows.map((row, index) => ({
            rank: index + 1,
            label: nameById.get(String(row._id)) || 'Deleted user',
            bestScore: row.bestScore,
            isYou: String(row._id) === String(id),
        }))

        return res.status(200).json({
            success: true,
            leaderboard,
        })
    } catch (error) {
        (req.log || logger).error('get leaderboard failed', { err: error })
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

        const nameById = await fetchNames(rows.map((row) => row._id))

        return res.status(200).json({
            success: true,
            leaderboard: withNames(rows, 'reviewCount', id, nameById),
        })
    } catch (error) {
        (req.log || logger).error('get weekly reviews leaderboard failed', { err: error })
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
            .select('currentStreak firstName lastName')
            .sort({ currentStreak: -1 })
            .limit(50)

        // already has the name on hand sir, no separate fetchNames round-trip needed here
        const leaderboard = rows.map((u, index) => ({
            rank: index + 1,
            label: `${u.firstName} ${u.lastName}`,
            value: u.currentStreak,
            isYou: String(u._id) === String(id),
        }))

        return res.status(200).json({
            success: true,
            leaderboard,
        })
    } catch (error) {
        (req.log || logger).error('get streaks leaderboard failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the streaks leaderboard',
        })
    }
}
