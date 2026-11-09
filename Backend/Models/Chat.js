const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema(
    {
        // the owner of this chat sir — every query must filter by this
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // shown in the chat list sidebar sir
        title: {
            type: String,
            default: 'New Chat',
            trim: true,
            maxlength: 80
        },
        // the parsed resume text, saved once when the chat starts sir. maxlength matches
        // MockInterview.js's identical pair of fields, per 2026-11-09 audit — this was the one
        // place in the app still missing the cap, after everywhere else got it this session.
        resumeText: {
            type: String,
            required: true,
            maxlength: 20000
        },
        // the job description this chat is about sir
        jd: {
            type: String,
            required: true,
            maxlength: 20000
        },
        // messages sir — count is already gated by plan.maxMessagesPerChat in controllers/Chat.js
        // (250/500 depending on plan) before a push happens, and per-message content length is
        // checked there too (5000 chars). maxlength here is defense-in-depth per 2026-11-08
        // audit, not the primary enforcement — a very long-running chat with no application-level
        // cap could otherwise approach Mongo's 16MB document limit.
        messages: [
            {
                role: {
                    type: String,
                    enum: ['user', 'assistant'],
                    required: true
                },
                content: {
                    type: String,
                    required: true,
                    maxlength: 20000
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    { timestamps: true }
)

module.exports = mongoose.model('Chat', chatSchema)
