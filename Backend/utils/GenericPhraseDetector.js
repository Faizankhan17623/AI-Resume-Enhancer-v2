// heuristic-only genericness check for cover letters sir — no extra AI call, no extra
// Groq cost/latency/failure surface, just string/regex checks on the text we already have

const GENERIC_PHRASES = [
    'team player',
    'hardworking individual',
    'detail-oriented professional',
    'results-driven',
    'results driven',
    'i am writing to express my interest',
    'proven track record',
    'go above and beyond',
    'go-getter',
    'self-motivated',
    'self motivated',
    'excellent communication skills',
    'fast learner',
    'passionate about',
    'wear many hats',
    'think outside the box',
    'synergy',
    'dynamic environment',
    'hit the ground running',
    'perfect fit for this role',
]

const METRIC_REGEX = /\d+%|\$\d+|\b\d+\+?\s?years?\b/i

// pulls distinctive words out of the JD (4+ letters, not a stopword) so we can check
// whether the letter actually engages with THIS job or just reads like a template sir
const STOPWORDS = new Set(['that', 'this', 'with', 'from', 'have', 'will', 'your', 'their', 'about', 'looking', 'experience', 'ability', 'skills', 'work', 'team'])

const extractKeywords = (jd) => {
    const words = (jd.toLowerCase().match(/[a-z]{4,}/g) || [])
    const unique = [...new Set(words)].filter((w) => !STOPWORDS.has(w))
    return unique.slice(0, 30)
}

// returns { score: 0-100 (higher = more generic), flags: [strings explaining why] } sir
const detectGenericness = (text, jd = '') => {
    const lower = text.toLowerCase()
    const flags = []
    let score = 0

    const matchedPhrases = GENERIC_PHRASES.filter((p) => lower.includes(p))
    if (matchedPhrases.length > 0) {
        score += Math.min(matchedPhrases.length * 15, 45)
        flags.push(`Uses generic phrasing: ${matchedPhrases.join(', ')}`)
    }

    const words = lower.match(/[a-z']+/g) || []
    if (words.length > 0) {
        const uniqueRatio = new Set(words).size / words.length
        if (uniqueRatio < 0.45) {
            score += 20
            flags.push('Low lexical variety — a lot of repeated words/phrasing')
        }
    }

    if (!METRIC_REGEX.test(text)) {
        score += 20
        flags.push('No concrete numbers, percentages, or years of experience mentioned')
    }

    if (jd) {
        const keywords = extractKeywords(jd)
        const overlap = keywords.filter((k) => lower.includes(k))
        if (keywords.length > 0 && overlap.length / keywords.length < 0.1) {
            score += 15
            flags.push('Barely references specifics from the job description')
        }
    }

    return { score: Math.min(score, 100), flags }
}

module.exports = { detectGenericness }
