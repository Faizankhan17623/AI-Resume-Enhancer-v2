const mongoose = require('mongoose')

// one simple message thread per JobApplication sir — deliberately plain: no read
// receipts, no typing indicators, no attachments, no real-time push. Just send a
// message, see the back-and-forth, refresh to check for new ones. Embedded
// messages array (not a separate collection) since one thread is small and
// bounded — a candidate/recruiter conversation about one job application never
// approaches a size where pagination matters.
const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['recruiter', 'candidate'], required: true },
    text: { type: String, trim: true, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
}, { _id: false })

const messageThreadSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.ObjectId,
            ref: 'Job',
            required: true,
        },
        application: {
            type: mongoose.Schema.ObjectId,
            ref: 'JobApplication',
            required: true,
            unique: true, // one thread per application sir, not one per message
            index: true,
        },
        recruiter: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        candidate: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        messages: {
            type: [messageSchema],
            default: [],
        },
        lastMessageAt: {
            type: Date,
        },
        // simple unread counters sir, one per side — bumped for whichever side did
        // NOT send the message, reset to 0 when that side opens/reads the thread
        recruiterUnreadCount: {
            type: Number,
            default: 0,
        },
        candidateUnreadCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
)

// each side's own "my message threads" list sir, newest activity first
messageThreadSchema.index({ recruiter: 1, lastMessageAt: -1 })
messageThreadSchema.index({ candidate: 1, lastMessageAt: -1 })

module.exports = mongoose.model('MessageThread', messageThreadSchema)
