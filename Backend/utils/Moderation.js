const Groq = require('groq-sdk')
const logger = require('./logger')
const { isFeatureEnabled } = require('./FeatureFlags')

// a SEPARATE classifier pass in front of the product's real AI calls sir — this is the second
// guardrail layer discussed in chat: the main AI_MODEL (utils/AiModel.js) already has its own
// trained-in refusals, but a system prompt / trained model alone can be argued with inside a long
// enough conversation. This runs independently, never sees the product's own system prompt, and
// doesn't care how persuasive the surrounding text was — it only looks at the raw text the user
// submitted, every single call, not just the ones that "look suspicious".
//
// Model: openai/gpt-oss-safeguard-20b sir, Groq's current safety-classifier model — NOT one of
// the MODEL_BY_PLAN chat models and not a cost/quality tier, it is a dedicated judge. (Llama
// Guard, tried first, is decommissioned on Groq as of writing — see utils/AiModel.js's own
// deprecation-tracking comment for the same kind of issue with qwen.)
const MODERATION_MODEL = 'openai/gpt-oss-safeguard-20b'

// 2000 TPM free-tier sir — far tighter than the 8000 TPM the product's real chat models get
// (see Middlewares/RateLimit.js's AI_LIMIT_BY_PLAN comment on Groq's per-model caps). A long
// cover letter or JD pasted in whole would blow this budget by itself before the classifier even
// runs, so the input is capped hard. Classifying the first ~6000 characters is enough to catch
// genuinely unsafe content — nobody opens with "ignore that, by the way here is how to..." on
// page 3 of a resume upload.
const MAX_INPUT_CHARS = 6000

// lazily constructed sir, same reasoning as services/reviewService.js's own grok() — the SDK
// throws AT CONSTRUCTION when GROK_API_KEY is unset, which would make merely REQUIRING this
// module fatal. This module is required transitively by half the route table (every controller
// that now calls moderateText), so an eager `new Groq(...)` here broke the whole app under the
// test suite, which deliberately never sets a real key.
let groqClient = null
const groq = () => {
    if (!groqClient) {
        groqClient = new Groq({ apiKey: process.env.GROK_API_KEY, timeout: 15 * 1000, maxRetries: 1 })
    }
    return groqClient
}

// test seam sir — lets a test drive moderateText without a real Groq account, same pattern as
// services/reviewService.js's _setGroqClient
const _setGroqClient = (client) => { groqClient = client }

// kept narrow sir, scoped to what this PRODUCT'S surface actually needs to catch — Resumify takes
// pasted job descriptions, raw "tell the AI about yourself" text, and open chat messages, not
// arbitrary internet content. csam is listed anyway as a hard always-flag category regardless of
// context.
const CATEGORIES = ['violence', 'self_harm', 'sexual', 'hate', 'harassment', 'illegal_activity', 'csam']

const SYSTEM_PROMPT = `You are a content safety classifier for Resumify, a resume-review and job-search product. The text you are given was typed or pasted by a user into a resume field, a job description field, or a chat message to an AI career coach.

Classify ONLY the text below. Respond with ONLY a JSON object, no other text:
{"flagged": boolean, "categories": string[], "reason": string}

"categories" is a subset of: ${CATEGORIES.join(', ')}.
"reason" is one short sentence, safe to show the user verbatim if flagged.

Do NOT flag: blunt or negative opinions about an employer/manager/coworker, ordinary resume content (even layoffs, firing, workplace conflict described factually), profanity used as ordinary frustration, or job descriptions that mention handling weapons/security/medical content as part of a legitimate job (e.g. "security guard", "butcher", "ICU nurse").
DO flag: genuine requests for help with violence, self-harm, weapons, csam, hate speech directed at a group, sexual content, harassment of a specific person, or instructions for illegal activity — regardless of whether it's dressed up as being "for a resume" or "for research".`

// result shape sir — always this shape, even on failure, so every call site can destructure
// { flagged, categories, reason } without a null check first
const ALLOW = { flagged: false, categories: [], reason: null }

// moderateText(text, { feature }) sir — call this BEFORE spending any credit, running any
// prompt-building, or hitting the product's real AI model. feature is just a label for logging.
//
// FAIL-OPEN sir, same policy as utils/FeatureFlags.js's isFeatureEnabled: if the moderation call
// itself errors (Groq down, this specific model rate-limited, malformed response), the user's
// request is allowed through rather than blocked. A safety check that is itself unreliable must
// never become the thing that takes the whole product down for every user — the product's
// existing per-feature AI call still has its own trained-in refusals as a second line, this is
// additive, not the only gate. Every failure is logged so a real outage is still visible.
const moderateText = async (text, { feature } = {}) => {
    if (!text || !text.trim()) return ALLOW

    // an admin kill switch sir, Settings-backed exactly like every other feature.* flag
    // (controllers/AdminSettings.js's KNOWN_KEYS) — lets ops turn this off instantly if the
    // classifier model itself is having a bad day and over-flagging real users, without a deploy
    if (!(await isFeatureEnabled('feature.moderation'))) return ALLOW

    const truncated = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text

    try {
        const completion = await groq().chat.completions.create({
            model: MODERATION_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: truncated },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 200,
            temperature: 0,
        })

        let raw = completion?.choices?.[0]?.message?.content
        if (!raw) return ALLOW

        if (raw.includes('</think>')) raw = raw.split('</think>').pop()
        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

        const parsed = JSON.parse(raw)
        if (typeof parsed?.flagged !== 'boolean') return ALLOW

        const categories = Array.isArray(parsed.categories)
            ? parsed.categories.filter((c) => CATEGORIES.includes(c))
            : []

        if (parsed.flagged) {
            logger.warn('moderation flagged content', { feature, categories, reason: parsed.reason })
        }

        return {
            flagged: parsed.flagged,
            categories,
            reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 300) : null,
        }
    } catch (err) {
        logger.error('moderation check failed, allowing request (fail-open)', { feature, err: err.message })
        return ALLOW
    }
}

// the standard 400 body sir, one shape every controller returns on a flag — never echoes the
// user's own flagged text back, never exposes the raw category list beyond what's useful for
// the user to understand and correct
const moderationBlockedResponse = (result) => ({
    success: false,
    code: 'CONTENT_FLAGGED',
    message: result.reason
        ? `Your request couldn't be processed: ${result.reason}`
        : "Your request couldn't be processed because it may violate our content policy.",
})

module.exports = { moderateText, moderationBlockedResponse, CATEGORIES, __test: { _setGroqClient } }
