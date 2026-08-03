// per-plan Groq model map sir — free-tier, non-deprecated, JSON-mode-capable.
// Free tier gives every model the SAME rate limit (30 RPM / 8K TPM / 1K RPD / 200K TPD), so this
// isn't a rate-limit upgrade path — Basic/Pro share the fast, small gpt-oss-20b (their prompts are
// lighter), ProMax steps up to gpt-oss-120b for its much larger structured JSON response.
//
// qwen/qwen3.6-27b was tried for ProMax and directly tested against the real ProMax prompt —
// it fails both ways: at its default max_tokens the response gets cut off mid-JSON
// (finish_reason: "length") and json_object mode then rejects the truncated output with a 400;
// raising max_tokens enough to avoid that (16,384, qwen's real ceiling) makes the request itself
// exceed the free tier's 8,000 TPM cap (413 rate_limit_exceeded). There is no safe max_tokens
// for qwen on this prompt under the free tier, so it's not used here.
//
// Each can still be overridden individually via env var without touching this file.
const MODEL_BY_PLAN = {
    Basic: process.env.GROQ_MODEL_BASIC || 'openai/gpt-oss-20b',
    Pro: process.env.GROQ_MODEL_PRO || 'openai/gpt-oss-20b',
    ProMax: process.env.GROQ_MODEL_PROMAX || 'openai/gpt-oss-120b',
}

// back-compat default sir — chat/cover-letter call sites that haven't been switched to
// getModelForPlan yet, and any code that just wants "the" model, land on ProMax's model
// (the same one this app has always defaulted to)
const AI_MODEL = process.env.GROQ_MODEL || MODEL_BY_PLAN.ProMax

// plan is a PLANS key ('Basic' | 'Pro' | 'ProMax') sir — falls back to Basic's model for
// anything unrecognized (a stale/expired plan, or a caller that hasn't resolved a plan yet)
const getModelForPlan = (plan) => MODEL_BY_PLAN[plan] || MODEL_BY_PLAN.Basic

// REMOVED sir: applyPlanDelay / DELAY_MS_BY_PLAN.
//
// It slept 5s for every Basic user and 2s for every Pro user before responding, purely to
// manufacture a felt speed difference between tiers. Two problems made it worth deleting:
//
//   1. Cost. Node serves requests on one thread; an awaited sleep holds the request, its socket
//      and its whole context open for the duration. On a constrained dyno that is deliberately
//      burned concurrency, and it is spent on exactly the free-tier users you have the most of.
//   2. It is not a real product difference. The tiers already differ honestly — credits, message
//      limits, prompt depth, and a genuinely larger model for ProMax (see MODEL_BY_PLAN above).
//      Slowing the free tier down on purpose does not make the paid tier faster.
//
// If a felt difference is wanted again, the honest version is a queue/priority lane where paid
// requests are served first under load, not a fixed sleep applied when there is no load at all.
module.exports = { AI_MODEL, MODEL_BY_PLAN, getModelForPlan }
