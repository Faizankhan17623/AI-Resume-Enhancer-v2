const { getUserPlan } = require('../utils/Plans')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { isFeatureEnabled, getFeatureFlagDetails } = require('../utils/FeatureFlags')
const { moderateText, moderationBlockedResponse } = require('../utils/Moderation')
const logger = require('../utils/logger')

// POST /job-search — Pro+ feature sir, searches the live web via Tavily for real job postings
// matching the user's query. No Groq call, no credit spend — same reasoning as cover letter's
// plan gate, just a web search instead of an LLM call.
exports.searchJobs = async (req, res) => {
    try {
        const id = req?.User.id

        if (!(await isFeatureEnabled('feature.jobSearch'))) {
            const details = await getFeatureFlagDetails('feature.jobSearch')
            return res.status(503).json({
                success: false,
                message: 'This feature is temporarily disabled',
                note: details.note,
                disabledUntil: details.disabledUntil,
            })
        }

        const plan = await getUserPlan(id)
        if (!plan || plan.key === 'Basic') {
            return res.status(403).json({
                success: false,
                message: 'Job search is a Pro feature, please upgrade your plan',
            })
        }

        const query = req.body.query
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please describe the job you are looking for',
            })
        }

        // moderation pass sir — this query is the one place in this file that leaves our own
        // server verbatim, straight to a third-party API (Tavily). No Groq call happens here
        // (see this file's own top comment), but the external-exposure risk is still real. See
        // utils/Moderation.js; fails open if the classifier itself errors.
        const modResult = await moderateText(query, { feature: 'job-search' })
        if (modResult.flagged) {
            return res.status(400).json(moderationBlockedResponse(modResult))
        }

        const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
            },
            body: JSON.stringify({
                query: `${query.trim()} job openings`,
                search_depth: 'basic',
                topic: 'general',
                max_results: 12,
                include_answer: false,
            }),
            // a hung Tavily backend must not leave this request open indefinitely sir —
            // same style of fetch-level timeout as Nodemailer.js's mail relay call
            signal: AbortSignal.timeout(15000),
        })

        if (!tavilyRes.ok) {
            const errText = await tavilyRes.text()
            ;(req.log || logger).error('job search upstream (Tavily) failed', { status: tavilyRes.status, body: errText?.slice(0, 500) })
            return res.status(502).json({
                success: false,
                message: 'The job search service is unavailable right now, please try again',
            })
        }

        const data = await tavilyRes.json()

        const jobs = (data.results || []).map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
            score: r.score,
        }))

        // fire-and-forget sir — same rule as the review/chat controllers
        recordFeatureUse(id)

        return res.status(200).json({
            success: true,
            jobs,
        })
    } catch (error) {
        (req.log || logger).error('search jobs failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while searching for jobs',
        })
    }
}
