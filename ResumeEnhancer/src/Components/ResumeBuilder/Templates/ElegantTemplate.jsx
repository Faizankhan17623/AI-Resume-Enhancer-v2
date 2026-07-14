const ElegantTemplate = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-800 shadow-2xl print:shadow-none print:m-0 mx-auto font-serif px-16 py-14">
      {/* Centered header */}
      <header className="text-center mb-10">
        <h1 className="text-3xl tracking-[0.15em] uppercase text-[#6b2d5c] font-light">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <div className="mt-3 mx-auto w-16 h-px bg-[#6b2d5c]" />
        {contactParts.length > 0 && (
          <p className="mt-3 text-xs tracking-[0.1em] text-slate-500">
            {contactParts.join('   ·   ')}
          </p>
        )}
      </header>

      {data?.summary && (
        <section className="mb-8 text-center">
          <p className="text-sm leading-loose text-slate-700 italic max-w-2xl mx-auto">
            {data.summary}
          </p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#6b2d5c] text-center mb-4">
            Experience
          </h2>
          <div className="space-y-5">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold text-slate-900 tracking-wide">
                    {exp.role || 'Role'}
                  </p>
                  <p className="text-xs text-slate-400 tracking-wide whitespace-nowrap ml-4">
                    {exp.startDate}{exp.startDate && ' – '}{exp.current ? 'Present' : exp.endDate}
                  </p>
                </div>
                <p className="text-xs text-slate-500 italic">
                  {exp.company}{exp.company && exp.location ? ', ' : ''}{exp.location}
                </p>
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-0 before:text-[#6b2d5c]">
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

      {education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#6b2d5c] text-center mb-4">
            Education
          </h2>
          <div className="space-y-2">
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">{edu.school || 'School'}</span>
                  {edu.degree && `, ${edu.degree}`}
                  {edu.field && ` in ${edu.field}`}
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
        <section className="mb-8 text-center">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#6b2d5c] mb-4">
            Skills
          </h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {skills.map((skill, idx) => (
              <span key={idx} className="text-xs tracking-wide text-slate-700">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#6b2d5c] text-center mb-4">
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div key={idx}>
                <p className="text-sm font-semibold text-slate-900">
                  {proj.name || 'Project'}
                  {proj.link && <span className="font-normal italic text-slate-500"> — {proj.link}</span>}
                </p>
                {proj.description && (
                  <p className="text-sm text-slate-700 leading-relaxed">{proj.description}</p>
                )}
                {proj.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {proj.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-0 before:text-[#6b2d5c]">
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
        <section className="text-center">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[#6b2d5c] mb-4">
            Certifications
          </h2>
          <div className="space-y-1">
            {certifications.map((cert, idx) => (
              <p key={idx} className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{cert.name || 'Certification'}</span>
                {cert.issuer && `, ${cert.issuer}`}
                {cert.date && <span className="text-slate-400"> · {cert.date}</span>}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default ElegantTemplate
