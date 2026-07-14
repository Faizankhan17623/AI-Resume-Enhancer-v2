const ModernMinimal = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-800 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans px-14 py-12">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-2xl font-light tracking-wide text-slate-900">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-2 text-xs text-slate-500 tracking-wide">
            {contactParts.join(' · ')}
          </p>
        )}
        <div className="mt-4 h-px w-full bg-teal-500" />
      </header>

      {data?.summary && (
        <section className="mb-8">
          <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-teal-600 mb-4">
            Experience
          </h2>
          <div className="space-y-5">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-slate-900">
                    {exp.role || 'Role'}
                  </p>
                  <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
                    {exp.startDate}{exp.startDate && ' – '}{exp.current ? 'Present' : exp.endDate}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {exp.company}{exp.company && exp.location ? ' · ' : ''}{exp.location}
                </p>
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-slate-300">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 h-px w-full bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-teal-600 mb-4">
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <p className="text-sm text-slate-800">
                  <span className="font-medium">{edu.school || 'School'}</span>
                  {edu.degree && <span className="text-slate-600">, {edu.degree}</span>}
                  {edu.field && <span className="text-slate-600"> in {edu.field}</span>}
                  {edu.gpa && <span className="text-slate-400"> · GPA {edu.gpa}</span>}
                </p>
                <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
                  {edu.startDate}{edu.startDate && ' – '}{edu.endDate}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-teal-600 mb-4">
            Skills
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {skills.map((skill, idx) => (
              <span key={idx} className="text-xs text-slate-700">
                {skill}{idx < skills.length - 1 && <span className="text-slate-300 ml-3">/</span>}
              </span>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-teal-600 mb-4">
            Projects
          </h2>
          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div key={idx}>
                <p className="text-sm font-medium text-slate-900">
                  {proj.name || 'Project'}
                  {proj.link && <span className="font-normal text-slate-400"> · {proj.link}</span>}
                </p>
                {proj.description && (
                  <p className="text-sm text-slate-700 leading-relaxed">{proj.description}</p>
                )}
                {proj.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {proj.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-slate-300">
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

      {certifications.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-teal-600 mb-4">
            Certifications
          </h2>
          <div className="space-y-1.5">
            {certifications.map((cert, idx) => (
              <p key={idx} className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{cert.name || 'Certification'}</span>
                {cert.issuer && ` · ${cert.issuer}`}
                {cert.date && <span className="text-slate-400"> · {cert.date}</span>}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default ModernMinimal
