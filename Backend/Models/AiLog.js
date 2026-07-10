const mongoose = require('mongoose')

// one row per Groq call sir — this powers the AI cost & health monitor on the admin dashboard
// written fire-and-forget by utils/AdminLog.js so a logging failure never breaks a user's request
const aiLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            index: true,
        },
        // which feature burned the tokens sir
        type: {
            type: String,
            enum: ['review', 'chat', 'cover-letter'],
            required: true,
        },
        // which plan tier made the call sir — this is what per-tier cost tracking groups by
        plan: {
            type: String,
            enum: ['Basic', 'Pro', 'ProMax'],
            default: 'Basic',
        },
        model: {
            type: String,
        },
        // token usage straight from the Groq response sir
        promptTokens: {
            type: Number,
            default: 0,
        },
        completionTokens: {
            type: Number,
            default: 0,
        },
        totalTokens: {
            type: Number,
            default: 0,
        },
        latencyMs: {
            type: Number,
            default: 0,
        },
        success: {
            type: Boolean,
            default: true,
        },
        // only filled when success is false sir
        error: {
            type: String,
        },
    },
    { timestamps: true }
)

// the monitor mostly asks "what happened recently" sir
aiLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AiLog', aiLogSchema)
