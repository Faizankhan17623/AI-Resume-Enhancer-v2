const { getUserPlan } = require('../utils/Plans')
const logger = require('../utils/logger')
const { isFeatureEnabled, getFeatureFlagDetails } = require('../utils/FeatureFlags')
const LearningResourceCache = require('../Models/LearningResourceCache')

// searches Tavily for real courses/tutorials matching one resourceQuery, checking the cache first sir
const fetchResourcesFor = async (query) => {
    const cached = await LearningResourceCache.findOne({ query })
    if (cached) return cached.results

    const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
            query: `${query} course`,
            search_depth: 'basic',
            topic: 'general',
            max_results: 3,
            include_answer: false,
        }),
        // a hung Tavily backend must not leave this request open indefinitely sir —
        // same style of fetch-level timeout as Nodemailer.js's mail relay call
        signal: AbortSignal.timeout(15000),
    })

    if (!tavilyRes.ok) {
        const errText = await tavilyRes.text()
        logger.error('learning resources upstream (Tavily) failed', { status: tavilyRes.status, body: errText?.slice(0, 500) })
        return null
    }

    const data = await tavilyRes.json()
    const results = (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score,
    }))

    // fire-and-forget sir — a cache-write failure must never break the response the user is waiting on
    LearningResourceCache.create({ query, results }).catch((err) => logger.error('learning resource cache write failed', { err: err }))

    return results
}

// POST /learning-resources — body: { query } sir, Pro+ feature (same tier as the
// learningRoadmap section itself, which Basic's review shape never includes). No Groq call,
// no credit spend — same reasoning as the job search plan gate, just a web search instead of an LLM call.
exports.getLearningResources = async (req, res) => {
    try {
        const id = req?.User.id

        if (!(await isFeatureEnabled('feature.learningResources'))) {
            const details = await getFeatureFlagDetails('feature.learningResources')
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
                message: 'Learning resources are a Pro feature, please upgrade your plan',
            })
        }

        const query = req.body.query
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A search query is required',
            })
        }

        const results = await fetchResourcesFor(query.trim())

        if (results === null) {
            return res.status(502).json({
                success: false,
                message: 'The learning resource search is unavailable right now, please try again',
            })
        }

        return res.status(200).json({
            success: true,
            results,
        })
    } catch (error) {
        (req.log || logger).error('get learning resources failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while finding learning resources',
        })
    }
}
