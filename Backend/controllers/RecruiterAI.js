// Three new Recruiter-facing AI tools sir — Pro/ProMax upsells, each metered by its own
// utils/RecruiterPlans.js counter. Thin controllers, same JSON-mode/defensive-parsing
// conventions as services/reviewService.js and services/fitScoreService.js, kept here rather
// than growing controllers/Job.js further since these three are their own product surface
// (not job-posting/application mutations).

const Grok = require('groq-sdk')

const Job = require('../Models/Job')
const JobApplication = require('../Models/JobApplication')
const { consumeJdWrite, refundJdWrite, consumeInterviewQGen, refundInterviewQGen, consumeSummary, refundSummary } = require('../utils/RecruiterPlans')
const { buildJobDescriptionPrompt, buildInterviewQuestionsPrompt, buildCandidateSummaryPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { AI_MODEL } = require('../utils/AiModel')
const logger = require('../utils/logger')

// same lazy-construction reasoning as reviewService.js/fitScoreService.js sir
let grokClient = null
const grok = () => {
    if (!grokClient) {
        grokClient = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })
    }
    return grokClient
}
const _setGroqClient = (client) => { grokClient = client }

const isJsonValidationFailure = (err) => err?.error?.error?.code === 'json_validate_failed'

const callGroqJson = async ({ userId, type, plan, messages }) => {
    const call = async () => {
        const t0 = Date.now()
        try {
            const result = await grok().chat.completions.create({
                messages,
                model: AI_MODEL,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: userId, type, plan, model: AI_MODEL, usage: result.usage, latencyMs: Date.now() - t0, success: true })
            return result
        } catch (aiErr) {
            logAi({ user: userId, type, plan, model: AI_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }
    }

    try {
        return await call()
    } catch (aiErr) {
        if (!isJsonValidationFailure(aiErr)) throw aiErr
        return await call() // one retry only sir, same as every other AI call in this app
    }
}

const parseJson = (raw) => {
    if (!raw) return null
    let cleaned = raw
    if (cleaned.includes('</think>')) cleaned = cleaned.split('</think>').pop()
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim()
    try {
        return JSON.parse(cleaned)
    } catch {
        return null
    }
}

// POST /recruiter-ai/job-description sir — body: { title, employmentType?, mustHaves }
exports.generateJobDescription = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { title, employmentType, mustHaves } = req.body

        if (!title?.trim() || !mustHaves?.trim()) {
            return res.status(400).json({ success: false, message: 'A title and your must-have requirements are required' })
        }

        const spend = await consumeJdWrite(recruiterId)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message, code: spend.code })
        }

        // this one's plain text, not JSON sir (see Prompts.js's buildJobDescriptionPrompt) —
        // the whole point of the prompt IS the description, no wrapper needed
        let completion
        try {
            const t0 = Date.now()
            completion = await grok().chat.completions.create({
                messages: [{ role: 'user', content: buildJobDescriptionPrompt(title.trim(), employmentType, mustHaves.trim()) }],
                model: AI_MODEL,
                temperature: 0.4,
            })
            logAi({ user: recruiterId, type: 'jd-writer', plan: spend.plan, model: AI_MODEL, usage: completion.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            await refundJdWrite(recruiterId)
            logger.error('job description AI call failed', { err: aiErr, recruiterId })
            return res.status(502).json({ success: false, message: 'Drafting is temporarily unavailable, please try again' })
        }

        const description = completion?.choices?.[0]?.message?.content?.trim()
        if (!description) {
            await refundJdWrite(recruiterId)
            return res.status(502).json({ success: false, message: 'The AI returned an empty response, please try again' })
        }

        return res.status(200).json({ success: true, description })
    } catch (error) {
        (req.log || logger).error('generate job description failed', { err: error })
        return res.status(500).json({ success: false, message: 'Something went wrong while drafting the description' })
    }
}

// POST /recruiter-ai/interview-questions sir — body: { jobId, questionCount? }. Reads the job's
// OWN description sir, so the suggestions are grounded in a real posting, not free-typed JD text.
exports.generateInterviewQuestions = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId, questionCount } = req.body

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('description')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const spend = await consumeInterviewQGen(recruiterId)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message, code: spend.code })
        }

        const count = Math.min(20, Math.max(1, parseInt(questionCount) || 8))

        let completion
        try {
            completion = await callGroqJson({
                userId: recruiterId,
                type: 'interview-question-gen',
                plan: spend.plan,
                messages: [{ role: 'user', content: buildInterviewQuestionsPrompt(job.description, count) }],
            })
        } catch (aiErr) {
            await refundInterviewQGen(recruiterId)
            logger.error('interview question generation AI call failed', { err: aiErr, recruiterId })
            return res.status(502).json({ success: false, message: 'Question generation is temporarily unavailable, please try again' })
        }

        const result = parseJson(completion?.choices?.[0]?.message?.content)
        if (!result || !Array.isArray(result.questions)) {
            await refundInterviewQGen(recruiterId)
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        return res.status(200).json({ success: true, questions: result.questions })
    } catch (error) {
        (req.log || logger).error('generate interview questions failed', { err: error })
        return res.status(500).json({ success: false, message: 'Something went wrong while generating questions' })
    }
}

// GET /recruiter-ai/applications/:applicationId/summary sir — an on-demand re-request of the
// candidate summary (the automatic one already ran once at apply time, see fitScoreService.js —
// this is for when a recruiter wants it regenerated).
exports.generateCandidateSummary = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { applicationId } = req.params

        const application = await JobApplication.findById(applicationId).populate('job')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }
        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({ success: false, message: 'You do not have access to this application' })
        }
        if (!application.resumeUrl) {
            return res.status(400).json({ success: false, message: 'This application has no resume on file' })
        }

        const spend = await consumeSummary(recruiterId)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message, code: spend.code })
        }

        // re-fetch and re-parse the resume text sir — the application only stores the uploaded
        // FILE (resumeUrl), not its extracted text, so a fresh on-demand summary re-downloads and
        // re-parses it exactly like applyToJob did once at apply time
        let resumeText
        try {
            const { PDFParse } = require('pdf-parse')
            const response = await fetch(application.resumeUrl)
            const buffer = Buffer.from(await response.arrayBuffer())
            const parsed = await new PDFParse({ data: buffer }).getText()
            resumeText = parsed?.text || ''
        } catch (fetchErr) {
            await refundSummary(recruiterId)
            logger.error('resume re-fetch for summary failed', { err: fetchErr, applicationId })
            return res.status(502).json({ success: false, message: 'Could not read this candidate\'s resume, please try again' })
        }

        let completion
        try {
            completion = await callGroqJson({
                userId: recruiterId,
                type: 'candidate-summary',
                plan: spend.plan,
                messages: [{ role: 'user', content: buildCandidateSummaryPrompt(application.job.description, resumeText) }],
            })
        } catch (aiErr) {
            await refundSummary(recruiterId)
            logger.error('candidate summary AI call failed', { err: aiErr, recruiterId })
            return res.status(502).json({ success: false, message: 'Summarizing is temporarily unavailable, please try again' })
        }

        const result = parseJson(completion?.choices?.[0]?.message?.content)
        if (!result || typeof result.summary !== 'string') {
            await refundSummary(recruiterId)
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        application.fitScoreReasoning = result.summary.slice(0, 1000)
        await application.save()

        return res.status(200).json({ success: true, summary: result.summary })
    } catch (error) {
        (req.log || logger).error('generate candidate summary failed', { err: error })
        return res.status(500).json({ success: false, message: 'Something went wrong while summarizing the candidate' })
    }
}

module.exports.__test = { _setGroqClient }
