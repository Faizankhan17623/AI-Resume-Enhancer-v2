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
        resumeText: {
            type: String,
            required: true,
        },
        jd: {
            type: String,
            required: true,
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
                // filled in once the user answers sir — null/absent means still awaiting an answer
                answer: { type: String },
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
