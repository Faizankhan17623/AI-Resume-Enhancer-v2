// The AI fit-scoring SERVICE sir — same shape as services/reviewService.js: plain data in,
// plain result out, no knowledge of HTTP. Scores ONE applicant's resume against ONE job
// description, automatically, right after a candidate applies (see controllers/Job.js's
// applyToJob). Deliberately BEST-EFFORT: the caller wraps this in its own try/catch and never
// lets a scoring failure fail the candidate's application — see the comment there for why.

const Grok = require('groq-sdk')

const { consumeAiScore, refundAiScore } = require('../utils/RecruiterPlans')
const { buildFitScorePrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { AI_MODEL } = require('../utils/AiModel')
const logger = require('../utils/logger')

// same lazy-construction reasoning as reviewService.js sir — merely requiring this module must
// never throw just because GROK_API_KEY happens to be unset
let grokClient = null
const grok = () => {
    if (!grokClient) {
        grokClient = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })
    }
    return grokClient
}

const _setGroqClient = (client) => { grokClient = client }

const isJsonValidationFailure = (err) => err?.error?.error?.code === 'json_validate_failed'

const VALID_TIERS = ['not_a_fit', 'can_get_it_done', 'hireable', 'best_fit']

/**
 * Scores one candidate's resume text against one job description, on behalf of a recruiter.
 *
 * Returns a RESULT rather than writing a response sir:
 *   { ok: true,  fitScore, fitTier, reasoning }
 *   { ok: false, reason }   — reason is a short, candidate-facing-safe string (e.g. plan limit
 *                             reached, AI unavailable) for JobApplication.fitScoreSkippedReason
 *
 * Consumes the RECRUITER's monthly AI-score quota (utils/RecruiterPlans.js), refunded on every
 * path that doesn't produce a usable score — mirrors reviewService.js's credit discipline, just
 * against the Recruiter plan's counters instead of the candidate credit system.
 */
const runFitScore = async ({ recruiterId, jobDescription, resumeText }) => {
    if (!jobDescription?.trim() || !resumeText?.trim()) {
        return { ok: false, reason: 'Nothing to score yet' }
    }

    const spend = await consumeAiScore(recruiterId)
    if (!spend.ok) {
        return { ok: false, reason: spend.message }
    }

    const messages = [
        { role: 'user', content: buildFitScorePrompt(jobDescription, resumeText) },
    ]

    const callGroq = async () => {
        const t0 = Date.now()
        try {
            const result = await grok().chat.completions.create({
                messages,
                model: AI_MODEL,
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            logAi({ user: recruiterId, type: 'fit-score', plan: spend.plan, model: AI_MODEL, usage: result.usage, latencyMs: Date.now() - t0, success: true })
            return result
        } catch (aiErr) {
            logAi({ user: recruiterId, type: 'fit-score', plan: spend.plan, model: AI_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }
    }

    let completion
    try {
        completion = await callGroq()
    } catch (aiErr) {
        if (!isJsonValidationFailure(aiErr)) {
            await refundAiScore(recruiterId)
            logger.error('fit score AI call failed', { err: aiErr, recruiterId })
            return { ok: false, reason: 'Scoring is temporarily unavailable' }
        }
        try {
            completion = await callGroq() // one retry only sir, same as reviewService.js
        } catch (retryErr) {
            await refundAiScore(recruiterId)
            logger.error('fit score AI call failed on retry', { err: retryErr, recruiterId })
            return { ok: false, reason: 'Scoring is temporarily unavailable' }
        }
    }

    let raw = completion?.choices?.[0]?.message?.content
    if (!raw) {
        await refundAiScore(recruiterId)
        return { ok: false, reason: 'The AI returned an empty response' }
    }

    if (raw.includes('</think>')) raw = raw.split('</think>').pop()
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    let result
    try {
        result = JSON.parse(raw)
    } catch (parseErr) {
        // truncated preview sir — same PII caution as reviewService.js, raw is derived from a
        // real resume
        logger.warn('fit score JSON parse failed', { err: parseErr, recruiterId, rawPreview: raw?.slice(0, 200) })
        await refundAiScore(recruiterId)
        return { ok: false, reason: 'The AI response was not in the expected format' }
    }

    if (typeof result.fitScore !== 'number' || !VALID_TIERS.includes(result.fitTier)) {
        await refundAiScore(recruiterId)
        return { ok: false, reason: 'The AI response was incomplete' }
    }

    return {
        ok: true,
        fitScore: Math.max(0, Math.min(100, Math.round(result.fitScore))),
        fitTier: result.fitTier,
        reasoning: typeof result.reasoning === 'string' ? result.reasoning.slice(0, 1000) : '',
    }
}

module.exports = { runFitScore, _setGroqClient }
