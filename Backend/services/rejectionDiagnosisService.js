// The rejection-diagnosis SERVICE sir — same plain-data-in/plain-result-out shape as
// reviewService.js and fitScoreService.js. User-side feature: given one of the user's OWN
// saved Review docs for an application they've marked Rejected on their personal tracker
// (Models/Application.js), asks the AI to reason about why it likely wasn't enough, using
// ONLY the data that review already captured — no new resume/JD text sent to Groq.
//
// Spends from the SAME credit pool a fresh ATS review spends from (utils/Plans.js's
// consumeCredit) — this is a real Groq call like any other AI feature in the app, not a
// separate free tier or a recruiter-side spend.

const Grok = require('groq-sdk')

const CreditSpend = require('../Models/CreditSpend')
const { consumeCredit, refundCredit } = require('../utils/Plans')
const { buildRejectionDiagnosisPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { getModelForPlan } = require('../utils/AiModel')
const logger = require('../utils/logger')

// lazy construction sir, same reasoning as reviewService.js/fitScoreService.js — requiring
// this module must never throw just because GROK_API_KEY happens to be unset
let grokClient = null
const grok = () => {
    if (!grokClient) {
        grokClient = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })
    }
    return grokClient
}

const _setGroqClient = (client) => { grokClient = client }

const isJsonValidationFailure = (err) => err?.error?.error?.code === 'json_validate_failed'

/**
 * Diagnoses why a rejected application's resume may not have been enough, using an already-saved
 * Review's data.
 *
 * Returns a RESULT rather than writing a response sir, same convention as runReview/runFitScore:
 *   { ok: true,  status: 200, reasoning, suggestedFix }
 *   { ok: false, status, message, code? }
 *
 * The credit is spent before the AI call and refunded on every path where the user gets nothing
 * back — same invariant as runReview: nobody is billed for a diagnosis they never received.
 */
const runRejectionDiagnosis = async ({ userId, reviewDoc }) => {
    if (!reviewDoc) {
        return { ok: false, status: 400, message: 'No review is linked to this application' }
    }

    const spend = await consumeCredit(userId)
    if (!spend.ok) {
        return { ok: false, status: 403, message: spend.message, code: spend.code }
    }

    // write-ahead marker sir, same crash-safety discipline as runReview — CreditReconcileCron.js
    // sweeps and refunds anything still sitting here after a crash orphans it
    const ledgerEntry = await CreditSpend.create({ user: userId, kind: 'rejection-diagnosis' })
    const resolveSpend = () => CreditSpend.deleteOne({ _id: ledgerEntry._id }).catch((err) =>
        logger.error('failed to resolve credit-spend ledger entry', { err, userId, ledgerEntryId: ledgerEntry._id })
    )

    const messages = [
        { role: 'user', content: buildRejectionDiagnosisPrompt(reviewDoc.review, reviewDoc.jdTitle) },
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
            logAi({ user: userId, type: 'rejection-diagnosis', plan: spend.plan, model, usage: result.usage, latencyMs: Date.now() - t0, success: true })
            return result
        } catch (aiErr) {
            logAi({ user: userId, type: 'rejection-diagnosis', plan: spend.plan, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }
    }

    let completion
    try {
        completion = await callGroq()
    } catch (aiErr) {
        if (!isJsonValidationFailure(aiErr)) {
            await refundCredit(userId)
            await resolveSpend()
            throw aiErr
        }
        try {
            completion = await callGroq() // one retry only sir, same as reviewService.js
        } catch (retryErr) {
            await refundCredit(userId)
            await resolveSpend()
            throw retryErr
        }
    }

    let raw = completion?.choices?.[0]?.message?.content
    if (!raw) {
        await refundCredit(userId)
        await resolveSpend()
        return { ok: false, status: 502, message: 'The AI returned an empty response, please try again' }
    }

    if (raw.includes('</think>')) raw = raw.split('</think>').pop()
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    let result
    try {
        result = JSON.parse(raw)
    } catch (parseErr) {
        // truncated preview sir — rawPreview only, same PII caution as reviewService.js
        logger.warn('rejection diagnosis JSON parse failed', { err: parseErr, userId, rawPreview: raw?.slice(0, 200) })
        await refundCredit(userId)
        await resolveSpend()
        return { ok: false, status: 502, message: 'The AI response was not in the expected format, please try again' }
    }

    if (typeof result.reasoning !== 'string' || !result.reasoning.trim()) {
        await refundCredit(userId)
        await resolveSpend()
        return { ok: false, status: 502, message: 'The AI response was incomplete, please try again' }
    }

    // the diagnosis reached the user either way sir — resolve, don't refund
    await resolveSpend()

    return {
        ok: true,
        status: 200,
        reasoning: result.reasoning.trim().slice(0, 1000),
        suggestedFix: typeof result.suggestedFix === 'string' ? result.suggestedFix.trim().slice(0, 500) : '',
    }
}

module.exports = { runRejectionDiagnosis, _setGroqClient }
