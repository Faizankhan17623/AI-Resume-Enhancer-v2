const mongoose = require('mongoose')

// one row per unique viewer of one shared portfolio sir — same "row per unique visitor, not a
// raw counter" idea as VisitorLog.js, applied per-resume instead of site-wide. viewerId is a
// cookie value (see controllers/BuiltResume.js's getPublicPortfolio), falling back to the
// requester's IP when no cookie could be set. The compound unique index is what actually
// prevents double-counting: a duplicate (resume, viewerId) insert just fails on the index
// instead of needing a racy check-then-insert in the controller.
const portfolioViewSchema = new mongoose.Schema(
    {
        resume: {
            type: mongoose.Schema.ObjectId,
            ref: 'BuiltResume',
            required: true,
            index: true,
        },
        viewerId: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
)

portfolioViewSchema.index({ resume: 1, viewerId: 1 }, { unique: true })

module.exports = mongoose.model('PortfolioView', portfolioViewSchema)
