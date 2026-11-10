// Learning resources schema sir — see controllers/LearningResources.js. Same 500-char bound as
// JobSearch.js's query — this is also used as a cache key and sent to Tavily.

const { z } = require('zod')

const getLearningResourcesSchema = z.object({
    query: z.string({ error: 'A search query is required' }).trim().min(1, 'A search query is required').max(500, 'That search is too long, please keep it under 500 characters'),
})

module.exports = {
    getLearningResourcesSchema,
}
