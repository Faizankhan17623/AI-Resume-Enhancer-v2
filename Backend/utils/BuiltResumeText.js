// flattens a BuiltResume's structured data into plain text sir — same shape the AI review
// pipeline already expects from a parsed PDF (see PDFParse's .getText() in controllers/AI.js),
// so a built resume can be scored through the exact same runReview() with zero pipeline changes.
const builtResumeToText = (resume) => {
    const lines = []
    const info = resume.personalInfo || {}

    const contactLine = [info.email, info.phone, info.location, info.linkedin, info.website]
        .filter(Boolean)
        .join(' | ')

    if (info.fullName) lines.push(info.fullName)
    if (contactLine) lines.push(contactLine)

    if (resume.summary) {
        lines.push('', 'SUMMARY', resume.summary)
    }

    if (resume.experience?.length) {
        lines.push('', 'EXPERIENCE')
        for (const exp of resume.experience) {
            const header = [exp.role, exp.company].filter(Boolean).join(' at ')
            const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' - ')
            lines.push([header, exp.location, dates].filter(Boolean).join(' | '))
            for (const bullet of exp.bullets || []) {
                if (bullet) lines.push(`- ${bullet}`)
            }
        }
    }

    if (resume.education?.length) {
        lines.push('', 'EDUCATION')
        for (const edu of resume.education) {
            const header = [edu.degree, edu.field].filter(Boolean).join(' in ')
            const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' - ')
            lines.push([edu.school, header, dates, edu.gpa ? `GPA: ${edu.gpa}` : null].filter(Boolean).join(' | '))
        }
    }

    if (resume.skills?.length) {
        lines.push('', 'SKILLS', resume.skills.join(', '))
    }

    if (resume.projects?.length) {
        lines.push('', 'PROJECTS')
        for (const proj of resume.projects) {
            lines.push([proj.name, proj.link].filter(Boolean).join(' | '))
            if (proj.description) lines.push(proj.description)
            for (const bullet of proj.bullets || []) {
                if (bullet) lines.push(`- ${bullet}`)
            }
        }
    }

    if (resume.certifications?.length) {
        lines.push('', 'CERTIFICATIONS')
        for (const cert of resume.certifications) {
            lines.push([cert.name, cert.issuer, cert.date].filter(Boolean).join(' | '))
        }
    }

    return lines.join('\n')
}

module.exports = { builtResumeToText }
