const ClassicTemplate = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-900 shadow-2xl print:shadow-none print:m-0 mx-auto font-serif">
      {/* Top banner */}
      <div className="bg-slate-900 text-white px-12 py-8 text-center">
        <h1 className="text-3xl tracking-wide font-serif">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-2 text-xs text-slate-300 tracking-wide">
            {contactParts.join('  |  ')}
          </p>
        )}
      </div>

      <div className="px-12 py-8">
        {data?.summary && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Summary
            </h2>
            <p className="text-sm leading-relaxed text-slate-800">{data.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-900">
                      {exp.role || 'Role'}{exp.company ? `, ${exp.company}` : ''}
                      {exp.location && <span className="font-normal text-slate-600"> — {exp.location}</span>}
                    </p>
                    <p className="text-xs text-slate-600 whitespace-nowrap ml-4">
                      {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'Present' : exp.endDate}
                    </p>
                  </div>
                  {exp.bullets?.filter(Boolean).length > 0 && (
                    <ul className="list-disc list-outside ml-5 mt-1 space-y-0.5">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-sm text-slate-800 leading-snug">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {education.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">{edu.school || 'School'}</span>
                    {edu.degree && ` — ${edu.degree}`}
                    {edu.field && ` in ${edu.field}`}
                    {edu.gpa && <span className="text-slate-600"> (GPA: {edu.gpa})</span>}
                  </p>
                  <p className="text-xs text-slate-600 whitespace-nowrap ml-4">
                    {edu.startDate}{edu.startDate && ' - '}{edu.endDate}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 border border-slate-300 rounded-sm text-slate-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-slate-900">
                    {proj.name || 'Project'}
                    {proj.link && (
                      <span className="font-normal text-slate-600"> — {proj.link}</span>
                    )}
                  </p>
                  {proj.description && (
                    <p className="text-sm text-slate-800 leading-snug">{proj.description}</p>
                  )}
                  {proj.bullets?.filter(Boolean).length > 0 && (
                    <ul className="list-disc list-outside ml-5 mt-1 space-y-0.5">
                      {proj.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-sm text-slate-800 leading-snug">{b}</li>
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
            <h2 className="text-sm uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Certifications
            </h2>
            <div className="space-y-1">
              {certifications.map((cert, idx) => (
                <p key={idx} className="text-sm text-slate-800">
                  <span className="font-semibold">{cert.name || 'Certification'}</span>
                  {cert.issuer && ` — ${cert.issuer}`}
                  {cert.date && <span className="text-slate-600"> ({cert.date})</span>}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default ClassicTemplate
