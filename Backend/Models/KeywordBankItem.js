const mongoose = require('mongoose')

// one keyword the AI has ever flagged for this user sir, across every review they've run —
// lets "add this to your resume" become a persistent, trackable to-do instead of a string that
// disappears back into a past review's JSON blob the moment they close the report
const keywordBankItemSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // stored lowercase+trimmed sir so "React" and "react " from two different reviews collapse
        // into one bank entry — keyword (below) keeps the original casing for display
        normalized: {
            type: String,
            required: true,
        },
        keyword: {
            type: String,
            required: true,
            trim: true,
        },
        // matched: the AI found it well-used already (Pro/ProMax only — Basic reviews never set this)
        // weak: present but under-used: missing: absent entirely (every plan can produce this one)
        // added: the user has marked it as now on their resume — a manual action, sticky across future syncs
        // ignored: the user dismissed it — also sticky, syncFromReview won't resurrect it back to missing/weak
        status: {
            type: String,
            enum: ['missing', 'weak', 'matched', 'added', 'ignored'],
            default: 'missing',
        },
        // every review that has ever mentioned this keyword sir, most recent last
        sourceReviews: [{
            type: mongoose.Schema.ObjectId,
            ref: 'Review',
        }],
        firstSeenAt: {
            type: Date,
            default: Date.now,
        },
        lastSeenAt: {
            type: Date,
            default: Date.now,
        },
    }, { timestamps: true }
)

keywordBankItemSchema.index({ user: 1, normalized: 1 }, { unique: true })
keywordBankItemSchema.index({ user: 1, status: 1 })

module.exports = mongoose.model('KeywordBankItem', keywordBankItemSchema)
