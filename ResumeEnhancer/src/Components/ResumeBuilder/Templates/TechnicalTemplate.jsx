const TechnicalTemplate = ({ data }) => {
  const personalInfo = data?.personalInfo || {}
  const experience = data?.experience || []
  const education = data?.education || []
  const skills = data?.skills || []
  const projects = data?.projects || []
  const certifications = data?.certifications || []

  const contactParts = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.website,
  ].filter(Boolean)

  return (
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-900 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans px-12 py-10">
      {/* Header */}
      <header className="mb-6 pb-4 border-b-2 border-emerald-600">
        <h1 className="text-2xl font-bold text-slate-900">
          <span className="text-emerald-600 font-mono">&gt;_</span> {personalInfo.fullName || 'Your Name'}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-1 text-xs text-slate-500 font-mono">
            {contactParts.join('  |  ')}
          </p>
        )}
      </header>

      {data?.summary && (
        <section className="mb-6">
          <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
        </section>
      )}

      {/* Skills forward — near the top */}
      {skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-2 font-mono">
            // Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-slate-900 text-emerald-300 rounded font-mono"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-3 font-mono">
            // Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold text-slate-900">
                    {exp.role || 'Role'} <span className="text-slate-400 font-mono text-xs">@</span> {exp.company}
                  </p>
                  <p className="text-xs text-slate-500 font-mono whitespace-nowrap ml-4">
                    {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'present' : exp.endDate}
                  </p>
                </div>
                {exp.location && <p className="text-xs text-slate-400">{exp.location}</p>}
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-snug pl-4 relative before:content-['$'] before:absolute before:left-0 before:text-emerald-600 before:font-mono">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-3 font-mono">
            // Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div key={idx}>
                <p className="text-sm font-semibold text-slate-900">
                  {proj.name || 'Project'}
                  {proj.link && (
                    <span className="font-mono font-normal text-xs text-slate-500"> ({proj.link})</span>
                  )}
                </p>
                {proj.description && (
                  <p className="text-sm text-slate-700 leading-snug">{proj.description}</p>
                )}
                {proj.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {proj.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-snug pl-4 relative before:content-['$'] before:absolute before:left-0 before:text-emerald-600 before:font-mono">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-8">
        {education.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-3 font-mono">
              // Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-slate-900">{edu.school || 'School'}</p>
                  {(edu.degree || edu.field) && (
                    <p className="text-xs text-slate-600">
                      {edu.degree}{edu.degree && edu.field ? ' in ' : ''}{edu.field}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 font-mono">
                    {edu.startDate}{edu.startDate && ' - '}{edu.endDate}
                    {edu.gpa && ` | gpa:${edu.gpa}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {certifications.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-3 font-mono">
              // Certifications
            </h2>
            <div className="space-y-2">
              {certifications.map((cert, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-slate-900">{cert.name || 'Certification'}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {cert.issuer}{cert.issuer && cert.date ? ' | ' : ''}{cert.date}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default TechnicalTemplate
