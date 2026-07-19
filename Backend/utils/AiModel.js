// single source of truth for the Groq model sir — change it ONLY here (or via the GROQ_MODEL env)
// qwen/qwen3-32b was shut down by Groq on 17 Jul 2026; openai/gpt-oss-120b is their official
// replacement: production tier, free plan gets 30 req/min, 1000 req/day, 8K TPM, 200K TPD
const AI_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

module.exports = { AI_MODEL }
