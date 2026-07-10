const fs = require('fs')
const path = require('path')
const writeGood = require('write-good')
const Typo = require('typo-js')

// loaded once at startup sir — the en_US dictionary is a few MB, no point re-reading it per request
const dictPath = path.join(__dirname, '..', 'node_modules', 'typo-js', 'dictionaries', 'en_US')
const affData = fs.readFileSync(path.join(dictPath, 'en_US.aff'), 'utf8')
const dicData = fs.readFileSync(path.join(dictPath, 'en_US.dic'), 'utf8')
const dictionary = new Typo('en_US', affData, dicData)

// words that are clearly not spelling mistakes but trip up a generic dictionary sir —
// tech stacks, resume boilerplate, common ATS keywords
const SKIP_WORDS = new Set([
    'ai', 'api', 'apis', 'ui', 'ux', 'ci', 'cd', 'cicd', 'devops', 'sql', 'nosql',
    'saas', 'paas', 'iaas', 'crud', 'oop', 'js', 'ts', 'html', 'css', 'json', 'xml',
    'aws', 'gcp', 'ios', 'android', 'linkedin', 'github', 'gitlab', 'npm', 'yarn',
])

// a "word" worth spell-checking sir — skip numbers, emails, urls, single letters, punctuation-only tokens
const isCheckableWord = (word) => {
    if (word.length < 3) return false
    if (/\d/.test(word)) return false
    if (/[@/:.]/.test(word)) return false
    return /^[a-zA-Z'-]+$/.test(word)
}

// skip ALL-CAPS tokens (acronyms like "AWS", "REST") and anything on the allowlist sir
const isLikelyProperNounOrAcronym = (word) => {
    if (word === word.toUpperCase()) return true
    if (SKIP_WORDS.has(word.toLowerCase())) return true
    return false
}

const checkSpelling = (text) => {
    const words = text.match(/[a-zA-Z'-]+/g) || []
    const seen = new Set()
    const issues = []

    for (const word of words) {
        if (!isCheckableWord(word)) continue
        if (isLikelyProperNounOrAcronym(word)) continue

        const key = word.toLowerCase()
        if (seen.has(key)) continue // only report each misspelling once sir, resumes repeat words a lot

        if (!dictionary.check(word)) {
            seen.add(key)
            const suggestions = dictionary.suggest(word).slice(0, 3)
            issues.push({
                type: 'spelling',
                message: suggestions.length
                    ? `"${word}" may be misspelled — did you mean: ${suggestions.join(', ')}?`
                    : `"${word}" may be misspelled`,
                context: word,
            })
        }
    }

    return issues
}

const checkStyle = (text) => {
    // write-good flags weak/passive language sir — great fit for resume bullet points
    const suggestions = writeGood(text)
    return suggestions.map((s) => ({
        type: 'style',
        message: s.reason,
        context: text.slice(s.index, s.index + s.offset),
    }))
}

// checkResumeText(text) -> { issues, score } sir
// score is a quick 0-100 visual indicator, separate from the AI's atsScore —
// it only reflects text-quality noise (typos, weak phrasing), not JD fit
const checkResumeText = (text) => {
    const spellingIssues = checkSpelling(text)
    const styleIssues = checkStyle(text)
    const issues = [...spellingIssues, ...styleIssues]

    // simple penalty curve sir — diminishing returns so a handful of issues doesn't tank the score to 0
    const score = Math.max(0, Math.round(100 - issues.length * 4))

    return { issues, score }
}

module.exports = { checkResumeText }
