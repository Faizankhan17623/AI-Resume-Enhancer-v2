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
            // NOTE sir — `type: String` directly inside this array's object was ambiguous: a key
            // literally named `type` at an object's first level is Mongoose's own shorthand
            // syntax marker ("this whole array is of type String"), so Mongoose silently
            // interpreted the ENTIRE issue object as a plain string instead of a subdocument —
            // severity/message were dropped from the real schema. Every non-empty formattingCheck
            // (any resume that actually triggered an issue: multi-column, no text layer, etc.)
            // then failed to save with a CastError, and the failure was only ever logged, never
            // surfaced. Wrapping `type: { type: String }` is Mongoose's documented escape hatch
            // for this exact collision — it disambiguates without changing the issue object's
            // shape (atsFormatCheck.js still emits { type, severity, message } unchanged).
            issues: [{
                type: { type: String },
                severity: { type: String, enum: ['high', 'medium', 'low'] },
                message: String,
            }],
        },
    }, { timestamps: true }
)

resumeSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Resume', resumeSchema)
