const mongoose = require('mongoose')

// in-app feedback popup submissions sir — star rating + optional comment, plus a
// separate NPS-style "how likely to refer a friend" score
const feedbackSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        reviewText: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        referralScore: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Feedback', feedbackSchema)
