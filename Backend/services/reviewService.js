// The resume review SERVICE sir — the business logic, with no knowledge of HTTP.
//
// WHY THIS EXISTS: `runReview` lived in controllers/AI.js and took `(req, res)`. Two problems
// followed from that signature:
//
//   1. controllers/BuiltResume.js had to `require` a CONTROLLER and hand it its own req/res, so
//      one controller wrote another controller's HTTP response. Ownership of the response was
//      genuinely ambiguous — reviewBuiltResume could not add a field, change a status code, or
//      handle a failure differently without editing AI.js.
//   2. None of this logic could be tested below the HTTP layer. Testing "does a failed Groq call
//      refund the credit" meant standing up supertest, a route, auth and a session.
//
// This module takes plain data and returns a plain result: { ok, status, ... }. The caller decides
// what to do with it. That makes the credit/refund rules — the part with real money attached —
// directly testable, and it lets two different endpoints present the same outcome differently.

const Grok = require('groq-sdk')

const Review = require('../Models/Review')
const { consumeCredit, refundCredit } = require('../utils/Plans')
const { buildReviewSystemPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { syncKeywordBankFromReview } = require('../utils/KeywordBank')
const { updateStreak } = require('../utils/Streak')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { getModelForPlan } = require('../utils/AiModel')
const { isFeatureEnabled, getFeatureFlagDetails } = require('../utils/FeatureFlags')
const logger = require('../utils/logger')

// timeout + maxRetries pinned explicitly sir — the SDK default retries 429/5xx with backoff and a
// long default timeout, so a rate-limited or stalled call could silently eat minutes before ever
// reaching our own error handling. Fail fast instead: one retry, 30s cap.
//
// Lazily constructed sir: the SDK throws at construction when GROK_API_KEY is unset, which would
// make merely REQUIRING this module fatal (and it is required, transitively, by the route table).
let grokClient = null
const grok = () => {
    if (!grokClient) {
        grokClient = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })
    }
    return grokClient
}

// test seam sir — lets a test drive the credit/refund rules without a real Groq account
const _setGroqClient = (client) => { grokClient = client }

// Occasionally the model emits malformed JSON on the larger prompts. Groq's own response_format
// validator rejects that outright with a 400 json_validate_failed, BEFORE we ever see content to
// parse. One silent retry resolves it most of the time since it's model non-determinism, not a
// real error — cheaper than making the user click "try again" by hand.
const isJsonValidationFailure = (err) => err?.error?.error?.code === 'json_validate_failed'

/**
 * Runs an ATS review.
 *
 * Returns a RESULT rather than writing a response sir:
 *   { ok: true,  status: 200, reviewId, review, formattingCheck }
 *   { ok: false, status, message, note?, disabledUntil? }
 *
 * The credit is spent before the AI call and refunded on every path where the user gets nothing
 * back, which is the invariant worth protecting here: nobody is billed for a review they never
 * received.
 */
const runReview = async ({ userId, resumeText, jd, formattingCheck = null }) => {
    if (!(await isFeatureEnabled('feature.review'))) {
        const details = await getFeatureFlagDetails('feature.review')
        return {
            ok: false,
            status: 503,
            message: 'This feature is temporarily disabled',
            note: details.note,
            disabledUntil: details.disabledUntil,
        }
    }

    if (!jd || typeof jd !== 'string' || !jd.trim()) {
        return { ok: false, status: 400, message: 'Job Description and Resume are required' }
    }

    const spend = await consumeCredit(userId)
    if (!spend.ok) {
        return { ok: false, status: 403, message: spend.message }
    }

    // plan-aware system prompt sir — Basic gets the core review, Pro adds keyword/section
    // analysis, ProMax gets the full deep report
    const messages = [
        { role: 'system', content: buildReviewSystemPrompt(spend.plan) },
        {
            role: 'user',
            content: `Analyze the following.\n\n=== JOB DESCRIPTION ===\n${jd}\n\n=== RESUME ===\n${resumeText}\n\nReturn only the JSON review.`,
        },
    ]

    const model = getModelForPlan(spend.plan)

    const callGroq = async () => {
        const t0 = Date.now()
        try {
            const result = await grok().chat.completions.create({
                messages,
                model,
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            logAi({ user: userId, type: 'review', plan: spend.plan, model, usage: result.usage, latencyMs: Date.now() - t0, success: true })
            return result
        } catch (aiErr) {
            logAi({ user: userId, type: 'review', plan: spend.plan, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }
    }

    let completion
    try {
        completion = await callGroq()
    } catch (aiErr) {
        // the user paid a credit and got NOTHING sir — hand it back before surfacing the failure,
        // otherwise every upstream outage quietly bills users for reviews they never received
        if (!isJsonValidationFailure(aiErr)) {
            await refundCredit(userId)
            throw aiErr
        }
        try {
            completion = await callGroq() // one retry only sir
        } catch (retryErr) {
            await refundCredit(userId)
            throw retryErr
        }
    }

    let raw = completion?.choices?.[0]?.message?.content
    if (!raw) {
        await refundCredit(userId)
        return { ok: false, status: 502, message: 'The AI returned an empty response, please try again' }
    }

    // strip the model's <think> reasoning block (qwen) and any stray ```json fences sir
    if (raw.includes('</think>')) raw = raw.split('</think>').pop()
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    let review
    try {
        review = JSON.parse(raw)
    } catch (parseErr) {
        // truncated sir — raw is derived from the user's resume/JD text (PII), so only the first
        // 200 chars go to the log: enough to spot a malformed-JSON pattern, not enough to dump
        // the resume itself
        logger.warn('AI review JSON parse failed', { err: parseErr, userId, rawPreview: raw?.slice(0, 200) })
        await refundCredit(userId)
        return { ok: false, status: 502, message: 'The AI response was not in the expected format, please try again' }
    }

    if (typeof review.atsScore !== 'number') {
        await refundCredit(userId)
        return { ok: false, status: 502, message: 'The AI response was incomplete, please try again' }
    }

    // save the review for history + the score-progress graph sir. A save failure must never eat a
    // review the user already paid a credit for, so it only logs.
    let reviewId = null
    try {
        const saved = await Review.create({
            user: userId,
            plan: spend.plan,
            jdTitle: jd.trim().slice(0, 60),
            atsScore: review.atsScore,
            verdict: review.verdict,
            scoreBreakdown: review.scoreBreakdown,
            review,
            formattingCheck,
        })
        reviewId = saved._id
    } catch (saveErr) {
        logger.error('review history save failed', { err: saveErr, userId })
    }

    // fire-and-forget sir — a streak failure must never break the review response
    updateStreak(userId)
    recordFeatureUse(userId)
    if (reviewId) syncKeywordBankFromReview(userId, reviewId, review)

    return { ok: true, status: 200, reviewId, review, formattingCheck }
}

module.exports = { runReview, _setGroqClient }
