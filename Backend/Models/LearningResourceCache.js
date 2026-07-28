const mongoose = require('mongoose')

// caches Tavily results per learningRoadmap resourceQuery sir — these repeat heavily across
// users (many people get "React hooks course" as a gap), so caching avoids paying Tavily twice
// for the same search. TTL index below auto-expires stale entries after 30 days.
const learningResourceCacheSchema = new mongoose.Schema(
    {
        query: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        results: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        fetchedAt: {
            type: Date,
            default: Date.now,
        },
    }
)

learningResourceCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

module.exports = mongoose.model('LearningResourceCache', learningResourceCacheSchema)
