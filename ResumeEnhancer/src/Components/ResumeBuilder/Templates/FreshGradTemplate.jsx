const FreshGradTemplate = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-800 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans">
      {/* Friendly rounded header */}
      <header className="bg-sky-500 text-white px-12 py-8 rounded-b-3xl">
        <h1 className="text-3xl font-bold">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-2 text-xs text-sky-50 tracking-wide">
            {contactParts.join('  ·  ')}
          </p>
        )}
      </header>

      <div className="px-12 py-8">
        {data?.summary && (
          <section className="mb-6 bg-sky-50 rounded-2xl p-4">
            <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
          </section>
        )}

        {/* Education-forward: appears before experience */}
        {education.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide text-sky-600 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff8577] inline-block" />
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline bg-slate-50 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{edu.school || 'School'}</span>
                    {edu.degree && ` — ${edu.degree}`}
                    {edu.field && ` in ${edu.field}`}
                    {edu.gpa && <span className="text-slate-500"> (GPA: {edu.gpa})</span>}
                  </p>
                  <p className="text-xs text-slate-500 whitespace-nowrap ml-4">
                    {edu.startDate}{edu.startDate && ' - '}{edu.endDate}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide text-sky-600 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff8577] inline-block" />
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 bg-[#ff8577]/10 text-[#c94f3f] rounded-full font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide text-sky-600 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff8577] inline-block" />
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {proj.name || 'Project'}
                    {proj.link && <span className="font-normal text-slate-500"> — {proj.link}</span>}
                  </p>
                  {proj.description && (
                    <p className="text-sm text-slate-700 leading-snug">{proj.description}</p>
                  )}
                  {proj.bullets?.filter(Boolean).length > 0 && (
                    <ul className="list-disc list-outside ml-5 mt-1 space-y-0.5">
                      {proj.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-sm text-slate-700 leading-snug">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience appears after education/projects, since it may be light */}
        {experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide text-sky-600 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff8577] inline-block" />
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-900">
                      {exp.role || 'Role'}{exp.company ? ` at ${exp.company}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 whitespace-nowrap ml-4">
                      {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'Present' : exp.endDate}
                    </p>
                  </div>
                  {exp.location && <p className="text-xs text-slate-500">{exp.location}</p>}
                  {exp.bullets?.filter(Boolean).length > 0 && (
                    <ul className="list-disc list-outside ml-5 mt-1 space-y-0.5">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-sm text-slate-700 leading-snug">{b}</li>
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
            <h2 className="text-sm uppercase tracking-wide text-sky-600 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff8577] inline-block" />
              Certifications
            </h2>
            <div className="space-y-1.5">
              {certifications.map((cert, idx) => (
                <p key={idx} className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{cert.name || 'Certification'}</span>
                  {cert.issuer && ` — ${cert.issuer}`}
                  {cert.date && <span className="text-slate-500"> ({cert.date})</span>}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default FreshGradTemplate
