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
        // first 60 chars of the JD sir — same trick as the chat sidebar title
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
        formattingCheck: {
            score: Number,
            issues: [{
                type: String,
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
