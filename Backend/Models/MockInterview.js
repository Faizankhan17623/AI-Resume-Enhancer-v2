const mongoose = require('mongoose')

// one structured mock-interview session sir — ProMax only. Same "parse resume+JD once, reuse
// every turn" shape as Chat.js, but each turn is a scored Q&A pair instead of freeform chat.
const mockInterviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // shown in the session list sidebar sir
        role: {
            type: String,
            default: 'Mock Interview',
            trim: true,
            maxlength: 80,
        },
        // 20000-char bounds sir, per 2026-11-08 audit — defense-in-depth, matching the
        // controller's own input checks (MockInterview.js's startMockInterview/answerMockInterview)
        resumeText: {
            type: String,
            required: true,
            maxlength: 20000,
        },
        jd: {
            type: String,
            required: true,
            maxlength: 20000,
        },
        status: {
            type: String,
            enum: ['in-progress', 'completed'],
            default: 'in-progress',
        },
        turns: [
            {
                question: { type: String, required: true },
                category: { type: String, trim: true },
                difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
                // filled in once the user answers sir — null/absent means still awaiting an answer.
                // 5000-char bound matches the controller's own check, per 2026-11-08 audit
                answer: { type: String, maxlength: 5000 },
                score: { type: Number, min: 1, max: 10 },
                feedback: { type: String },
                sampleAnswer: { type: String },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
)

module.exports = mongoose.model('MockInterview', mockInterviewSchema)
