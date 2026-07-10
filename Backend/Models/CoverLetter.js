const mongoose = require('mongoose')

// one AI-generated cover letter sir — tied to the user + which JD it was written for
const coverLetterSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // first 60 chars of the JD sir — same trick as the review/chat titles
        jdTitle: {
            type: String,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
    }, { timestamps: true }
)

coverLetterSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('CoverLetter', coverLetterSchema)
