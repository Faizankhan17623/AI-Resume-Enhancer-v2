const KeywordBankItem = require('../Models/KeywordBankItem')

// pulls every keyword out of a just-created Review's AI response sir and upserts each into the
// user's running keyword bank. FIRE-AND-FORGET like AdminLog's loggers — a sync failure must
// never break the review response the user already spent a credit on.
//
// plan shape reminder (see Backend/utils/Prompts.js):
//   Basic:        review.missingKeywords: string[]
//   Pro/ProMax:   review.missingKeywords: string[] + review.keywordAnalysis: { matched, weak, missing }
const syncKeywordBankFromReview = async (userId, reviewId, review) => {
    try {
        const buckets = [
            ...(review?.missingKeywords || []).map((k) => ({ keyword: k, status: 'missing' })),
            ...(review?.keywordAnalysis?.matched || []).map((k) => ({ keyword: k, status: 'matched' })),
            ...(review?.keywordAnalysis?.weak || []).map((k) => ({ keyword: k, status: 'weak' })),
            ...(review?.keywordAnalysis?.missing || []).map((k) => ({ keyword: k, status: 'missing' })),
        ].filter((b) => typeof b.keyword === 'string' && b.keyword.trim())

        // same keyword can appear in both missingKeywords and keywordAnalysis.missing sir —
        // de-dupe within this one review before touching the DB, keeping the first status seen
        const seen = new Map()
        for (const b of buckets) {
            const normalized = b.keyword.trim().toLowerCase()
            if (!seen.has(normalized)) seen.set(normalized, { keyword: b.keyword.trim(), status: b.status })
        }

        for (const [normalized, { keyword, status }] of seen) {
            const existing = await KeywordBankItem.findOne({ user: userId, normalized })

            if (!existing) {
                await KeywordBankItem.create({
                    user: userId,
                    normalized,
                    keyword,
                    status,
                    sourceReviews: [reviewId],
                })
                continue
            }

            // a user's own 'added'/'ignored' call is sticky sir — a later review re-flagging the
            // same word as missing/weak/matched should never silently override their action
            const update = {
                lastSeenAt: new Date(),
                $addToSet: { sourceReviews: reviewId },
            }
            if (!['added', 'ignored'].includes(existing.status)) {
                update.status = status
            }
            await KeywordBankItem.updateOne({ _id: existing._id }, update)
        }
    } catch (err) {
        console.log('keyword bank sync failed:', err.message)
    }
}

module.exports = { syncKeywordBankFromReview }
