const mongoose = require('mongoose')
const KeywordBankItem = require('../Models/KeywordBankItem')

// GET /keyword-bank — every keyword the AI has ever flagged for this user sir, newest first
exports.getKeywordBank = async (req, res) => {
    try {
        const id = req?.User.id

        const items = await KeywordBankItem.find({ user: id })
            .select('keyword status firstSeenAt lastSeenAt sourceReviews')
            .sort({ lastSeenAt: -1 })

        // coverage % sir — only meaningful once there's at least one matched/added/weak/missing
        // signal; a brand-new user with zero reviews gets null, not a misleading 0%
        const total = items.length
        const covered = items.filter((i) => ['matched', 'added'].includes(i.status)).length
        const coveragePercent = total > 0 ? Math.round((covered / total) * 100) : null

        return res.status(200).json({
            success: true,
            items,
            summary: {
                total,
                covered,
                missing: items.filter((i) => i.status === 'missing').length,
                weak: items.filter((i) => i.status === 'weak').length,
                ignored: items.filter((i) => i.status === 'ignored').length,
                coveragePercent,
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your keyword bank',
        })
    }
}

// PATCH /keyword-bank/:itemId — mark a keyword as added to your resume, ignored, or reset back
// to its last AI-flagged status sir
exports.updateKeywordStatus = async (req, res) => {
    try {
        const id = req?.User.id
        const { itemId } = req.params
        const { status } = req.body

        if (!mongoose.isValidObjectId(itemId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid keyword id',
            })
        }

        if (!['added', 'ignored', 'missing'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be added, ignored, or missing',
            })
        }

        const item = await KeywordBankItem.findOneAndUpdate(
            { _id: itemId, user: id },
            { status },
            { new: true }
        )

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Keyword not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Keyword updated',
            item,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the keyword',
        })
    }
}
