const mongoose = require('mongoose')

// one saved resume version sir — lets a user re-score or re-use a resume without re-uploading the PDF every time
const resumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // the original filename sir — doubles as the default label in the UI
        originalFilename: {
            type: String,
            trim: true,
        },
        // user-editable name sir, e.g. "Frontend resume v2" — falls back to the filename if never renamed
        label: {
            type: String,
            trim: true,
            maxlength: 80,
        },
        // the parsed text sir — same thing Chat.resumeText already stores per-chat, just reusable across reviews
        resumeText: {
            type: String,
            required: true,
        },
        // the one resume "New Review" pre-selects sir — only one can be true per user (enforced in the controller)
        isDefault: {
            type: Boolean,
            default: false,
        },
        // structural ATS parse-safety scan sir, run once at save time so it's reusable across
        // every review that uses this saved resume without re-scanning the PDF each time
        formattingCheck: {
            score: Number,
            issues: [{
                type: String,
                severity: { type: String, enum: ['high', 'medium', 'low'] },
                message: String,
            }],
        },
    }, { timestamps: true }
)

resumeSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Resume', resumeSchema)
