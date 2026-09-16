const mongoose = require('mongoose')

// small library of reusable reply texts sir, per direct request — Admin manages them, Support
// picks from the list instead of retyping the same explanation every time (ban reasons,
// suspension-appeal rejections, etc). Deliberately simple: title + body, no categories/tags —
// this is a quick-reply picker, not a knowledge base.
const cannedResponseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            required: true,
            maxlength: 100,
        },
        body: {
            type: String,
            trim: true,
            required: true,
            maxlength: 2000,
        },
        createdBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('CannedResponse', cannedResponseSchema)
