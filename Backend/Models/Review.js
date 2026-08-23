const mongoose = require('mongoose')

// one saved ATS review sir — this powers the history list, the score-progress graph and the PDF export
const ReviewCreation = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // which plan produced this review sir — deeper plans saved deeper reports
        plan: {
            type: String,
            enum: ['Basic', 'Pro', 'ProMax'],
            default: 'Basic',
        },
        // the AI's own extracted job title sir (review.jobTitle from the parsed response) — NOT
        // a raw slice of the pasted JD text anymore. That used to just take the JD's first 60
        // characters verbatim, so a JD copy-pasted from another AI tool's output (with its own
        // preamble like "Already fetched it earlier. Here it is: ---") showed THAT as the title
        // on the Overview/History pages instead of the actual role. The AI reads the whole JD
        // anyway, so it can extract the real title far more reliably than a blind slice ever could.
        jdTitle: {
            type: String,
            trim: true,
        },
        // pulled to the top level so the history list + graph never load the full report sir
        atsScore: {
            type: Number,
            required: true,
        },
        verdict: {
            type: String,
        },
        scoreBreakdown: {
            keywordMatch: Number,
            experienceRelevance: Number,
            skillsCoverage: Number,
            formatting: Number,
        },
        // structural ATS parse-safety check sir — separate from the AI's subjective "formatting"
        // score above, this is a deterministic scan (pdfjs) for things that break real ATS parsers:
        // multi-column layout, embedded images, missing text layer, non-standard fonts
        // NOTE sir — see Models/Resume.js's formattingCheck for the full explanation. `type:
        // { type: String }` disambiguates Mongoose's array-shorthand collision with our own
        // `type` field name; without it every non-empty formattingCheck failed to save.
        formattingCheck: {
            score: Number,
            issues: [{
                type: { type: String },
                severity: { type: String, enum: ['high', 'medium', 'low'] },
                message: String,
            }],
        },
        // the complete JSON the model returned sir — shape differs per plan so keep it flexible
        review: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        // unguessable id for the public share link sir — sparse so the unique index
        // ignores the (many) reviews that were never shared
        shareId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
        // who the public link is framed for sir — same underlying safe-subset data either way,
        // only the closing CTA on the shared page differs (see SharedReport.jsx)
        shareAudience: {
            type: String,
            enum: ['friend', 'recruiter'],
            default: 'friend',
        },
    }, { timestamps: true }
)

// newest-first history per user is our main query sir
ReviewCreation.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Review', ReviewCreation)
