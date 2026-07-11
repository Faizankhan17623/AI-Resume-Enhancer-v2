const { getUserPlan } = require('../utils/Plans')

// POST /job-search — Pro+ feature sir, searches the live web via Tavily for real job postings
// matching the user's query. No Groq call, no credit spend — same reasoning as cover letter's
// plan gate, just a web search instead of an LLM call.
exports.searchJobs = async (req, res) => {
    try {
        const id = req?.User.id

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
        })

        if (!tavilyRes.ok) {
            const errText = await tavilyRes.text()
            console.log('Tavily error:', tavilyRes.status, errText)
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

        return res.status(200).json({
            success: true,
            jobs,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while searching for jobs',
        })
    }
}
