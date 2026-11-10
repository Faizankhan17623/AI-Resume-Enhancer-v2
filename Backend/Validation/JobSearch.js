// Live job search schema sir — see controllers/JobSearch.js. 500-char cap: a short search
// query, not a job-description-length field, sent straight to Tavily and the moderation
// classifier.

const { z } = require('zod')

const searchJobsSchema = z.object({
    query: z.string({ error: 'Please describe the job you are looking for' }).trim().min(1, 'Please describe the job you are looking for').max(500, 'That search is too long, please keep it under 500 characters'),
})

module.exports = {
    searchJobsSchema,
}
