const mongoose = require('mongoose')

// one AI-generated outreach message sir — tied to the user + which JD it was written for.
// same shape as Models/CoverLetter.js, minus genericScore (that heuristic targets cover-letter
// clichés specifically, not applicable to a short DM-style message)
const outreachMessageSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // first 60 chars of the JD sir — same trick as the review/cover-letter titles
        jdTitle: {
            type: String,
            trim: true,
        },
        // for the email case sir — a LinkedIn DM has no subject line, the frontend just skips
        // showing this field for that destination
        subject: {
            type: String,
            trim: true,
            default: '',
        },
        body: {
            type: String,
            required: true,
        },
    }, { timestamps: true }
)

outreachMessageSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('OutreachMessage', outreachMessageSchema)
