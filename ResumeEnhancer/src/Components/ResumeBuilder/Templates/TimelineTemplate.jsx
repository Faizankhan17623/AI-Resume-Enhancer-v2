const TimelineTemplate = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-800 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans px-12 py-11">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">{contactParts.join('  •  ')}</p>
        )}
      </header>

      {data?.summary && (
        <section className="mb-8">
          <p className="text-sm leading-relaxed text-slate-700 text-center max-w-2xl mx-auto">{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-600 font-bold mb-5">
            Experience
          </h2>
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-violet-200">
            {experience.map((exp, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-violet-100" />
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold text-slate-900">
                    {exp.role || 'Role'}{exp.company ? ` · ${exp.company}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
                    {exp.startDate}{exp.startDate && ' – '}{exp.current ? 'Present' : exp.endDate}
                  </p>
                </div>
                {exp.location && <p className="text-xs text-slate-500">{exp.location}</p>}
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['–'] before:absolute before:left-0 before:text-violet-300">
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
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-600 font-bold mb-4">
            Education
          </h2>
          <div className="space-y-2.5">
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">{edu.school || 'School'}</span>
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

      <div className="grid grid-cols-2 gap-8">
        {skills.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.25em] text-violet-600 font-bold mb-3">
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (
                <span key={idx} className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {certifications.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.25em] text-violet-600 font-bold mb-3">
              Certifications
            </h2>
            <div className="space-y-1.5">
              {certifications.map((cert, idx) => (
                <p key={idx} className="text-xs text-slate-700">
                  <span className="font-medium text-slate-900">{cert.name || 'Certification'}</span>
                  {cert.issuer && ` · ${cert.issuer}`}
                  {cert.date && <span className="text-slate-400"> · {cert.date}</span>}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>

      {projects.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-600 font-bold mb-4">
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div key={idx}>
                <p className="text-sm font-semibold text-slate-900">
                  {proj.name || 'Project'}
                  {proj.link && <span className="font-normal text-slate-400"> · {proj.link}</span>}
                </p>
                {proj.description && (
                  <p className="text-sm text-slate-700 leading-relaxed">{proj.description}</p>
                )}
                {proj.bullets?.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {proj.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['–'] before:absolute before:left-0 before:text-violet-300">
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
    </div>
  )
}

export default TimelineTemplate
