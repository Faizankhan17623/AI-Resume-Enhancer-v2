// Word-level diff for resume version comparisons — no external dependency (Myers/LCS diff
// libraries pull in real bundle weight for something a ~50-line LCS implementation handles fine
// at the size of resume text: a bullet point or a job title, never a whole document).
//
// diffWords(oldText, newText) returns an array of { value, type } tokens where type is
// 'same' | 'removed' | 'added', in display order (removed tokens before added ones, matching
// how most diff UIs read left-to-right).
const tokenize = (text) => (text || '').split(/(\s+)/).filter(Boolean)

export const diffWords = (oldText, newText) => {
    const a = tokenize(oldText)
    const b = tokenize(newText)

    // classic LCS table sir — a[i-1] vs b[j-1], dp[i][j] = LCS length of a[0..i) and b[0..j)
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
        }
    }

    const tokens = []
    let i = 0, j = 0
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            tokens.push({ value: a[i], type: 'same' })
            i++; j++
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            tokens.push({ value: a[i], type: 'removed' })
            i++
        } else {
            tokens.push({ value: b[j], type: 'added' })
            j++
        }
    }
    while (i < a.length) { tokens.push({ value: a[i], type: 'removed' }); i++ }
    while (j < b.length) { tokens.push({ value: b[j], type: 'added' }); j++ }

    return tokens
}

// true when a and b are the "same" bullet/entry for LIST diffing purposes sir — not a deep
// equality check, just a stable identity so an edited bullet shows as "changed" rather than
// "one removed + one added" (which reads as a bigger edit than it was)
const bulletsRoughlyMatch = (a, b) => {
    if (!a || !b) return false
    const na = (a || '').trim().toLowerCase()
    const nb = (b || '').trim().toLowerCase()
    if (!na || !nb) return false
    // same opening few words sir — good enough signal that this is an edit, not a replacement
    return na.slice(0, 12) === nb.slice(0, 12)
}

// diffs two string arrays (bullets, or any flat list) sir — returns entries tagged same/added/
// removed/changed, changed ones carrying a word-level diff of their own text
export const diffStringList = (oldList = [], newList = []) => {
    const old = [...(oldList || [])]
    const next = [...(newList || [])]
    const entries = []
    const usedNew = new Set()

    old.forEach((oldItem) => {
        const matchIndex = next.findIndex((n, idx) => !usedNew.has(idx) && n === oldItem)
        if (matchIndex !== -1) {
            usedNew.add(matchIndex)
            entries.push({ type: 'same', value: oldItem })
            return
        }
        const changedIndex = next.findIndex((n, idx) => !usedNew.has(idx) && bulletsRoughlyMatch(oldItem, n))
        if (changedIndex !== -1) {
            usedNew.add(changedIndex)
            entries.push({ type: 'changed', oldValue: oldItem, newValue: next[changedIndex], words: diffWords(oldItem, next[changedIndex]) })
            return
        }
        entries.push({ type: 'removed', value: oldItem })
    })

    next.forEach((newItem, idx) => {
        if (!usedNew.has(idx)) entries.push({ type: 'added', value: newItem })
    })

    return entries
}

// top-level resume field diff sir — mirrors Backend's VERSION_FIELDS shape
// (title/personalInfo/summary/experience/education/skills/projects/certifications).
// Only produces entries for fields that actually changed, so a caller can render "no changes
// in this section" when a field's diff array comes back empty.
export const diffResumeVersions = (oldVersion, newVersion) => {
    const result = {}

    if ((oldVersion?.title || '') !== (newVersion?.title || '')) {
        result.title = diffWords(oldVersion?.title, newVersion?.title)
    }
    if ((oldVersion?.summary || '') !== (newVersion?.summary || '')) {
        result.summary = diffWords(oldVersion?.summary, newVersion?.summary)
    }

    result.skills = diffStringList(oldVersion?.skills, newVersion?.skills)

    // experience/education/projects/certifications are OBJECT lists sir — diff by a stable-ish
    // identity field, then word-diff whichever text field actually carries the substance
    result.experience = diffObjectList(
        oldVersion?.experience, newVersion?.experience,
        (e) => `${e?.company || ''}|${e?.role || ''}`,
        (e) => (e?.bullets || []).join(' ')
    )
    result.education = diffObjectList(
        oldVersion?.education, newVersion?.education,
        (e) => `${e?.school || ''}|${e?.degree || ''}`,
        (e) => `${e?.field || ''} ${e?.gpa || ''}`
    )
    result.projects = diffObjectList(
        oldVersion?.projects, newVersion?.projects,
        (p) => p?.name || '',
        (p) => `${p?.description || ''} ${(p?.bullets || []).join(' ')}`
    )
    result.certifications = diffObjectList(
        oldVersion?.certifications, newVersion?.certifications,
        (c) => `${c?.name || ''}|${c?.issuer || ''}`,
        (c) => c?.date || ''
    )

    const hasAnyChange = Object.keys(result).some((key) => {
        const v = result[key]
        return Array.isArray(v) ? v.some((e) => e.type !== 'same') : true
    })

    return { ...result, hasAnyChange }
}

// diffs a list of objects (experience entries, education entries, ...) sir — identityOf gives a
// stable key to match old/new entries by (company+role, school+degree, ...), textOf extracts the
// text worth word-diffing when a matched entry's content differs
const diffObjectList = (oldList = [], newList = [], identityOf, textOf) => {
    const old = [...(oldList || [])]
    const next = [...(newList || [])]
    const entries = []
    const usedNew = new Set()

    old.forEach((oldItem) => {
        const matchIndex = next.findIndex((n, idx) => !usedNew.has(idx) && identityOf(n) === identityOf(oldItem))
        if (matchIndex === -1) {
            entries.push({ type: 'removed', value: oldItem })
            return
        }
        usedNew.add(matchIndex)
        const newItem = next[matchIndex]
        const oldText = textOf(oldItem)
        const newText = textOf(newItem)
        if (oldText === newText && JSON.stringify(oldItem) === JSON.stringify(newItem)) {
            entries.push({ type: 'same', value: oldItem })
        } else {
            entries.push({ type: 'changed', oldValue: oldItem, newValue: newItem, words: diffWords(oldText, newText) })
        }
    })

    next.forEach((newItem, idx) => {
        if (!usedNew.has(idx)) entries.push({ type: 'added', value: newItem })
    })

    return entries
}
