const BoldTemplate = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-900 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans relative">
      {/* High-contrast dark header band with geometric accent */}
      <div className="bg-[#0f0f0f] text-white px-12 py-9 relative overflow-hidden">
        <div className="absolute -right-6 -top-10 w-32 h-32 bg-[#ffd23f] rotate-45" />
        <div className="absolute right-16 -bottom-14 w-20 h-20 bg-[#ffd23f]/40 rotate-12" />
        <div className="relative">
          <h1 className="text-4xl font-black tracking-tight uppercase">
            {personalInfo.fullName || 'Your Name'}
          </h1>
          {contactParts.length > 0 && (
            <p className="mt-3 text-xs text-slate-300 font-medium tracking-wide">
              {contactParts.join('   /   ')}
            </p>
          )}
        </div>
      </div>
      <div className="h-2 w-full bg-[#ffd23f]" />

      <div className="px-12 py-8">
        {data?.summary && (
          <section className="mb-6">
            <p className="text-sm leading-relaxed text-slate-800 font-medium">{data.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide font-black text-white bg-[#0f0f0f] inline-block px-3 py-1 mb-3">
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx} className="border-l-4 border-[#ffd23f] pl-4">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-bold text-slate-900">
                      {exp.role || 'Role'}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold whitespace-nowrap ml-4">
                      {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'PRESENT' : exp.endDate}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">
                    {exp.company}{exp.company && exp.location ? ' — ' : ''}{exp.location}
                  </p>
                  {exp.bullets?.filter(Boolean).length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-sm text-slate-800 leading-snug pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.5em] before:w-2 before:h-2 before:bg-[#ffd23f]">
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
            <section className="mb-6">
              <h2 className="text-sm uppercase tracking-wide font-black text-white bg-[#0f0f0f] inline-block px-3 py-1 mb-3">
                Education
              </h2>
              <div className="space-y-2">
                {education.map((edu, idx) => (
                  <div key={idx}>
                    <p className="text-sm font-bold text-slate-900">{edu.school || 'School'}</p>
                    {(edu.degree || edu.field) && (
                      <p className="text-xs text-slate-600">
                        {edu.degree}{edu.degree && edu.field ? ' in ' : ''}{edu.field}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 font-semibold">
                      {edu.startDate}{edu.startDate && ' - '}{edu.endDate}
                      {edu.gpa && ` · GPA ${edu.gpa}`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {certifications.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm uppercase tracking-wide font-black text-white bg-[#0f0f0f] inline-block px-3 py-1 mb-3">
                Certifications
              </h2>
              <div className="space-y-2">
                {certifications.map((cert, idx) => (
                  <div key={idx}>
                    <p className="text-sm font-bold text-slate-900">{cert.name || 'Certification'}</p>
                    <p className="text-xs text-slate-500">
                      {cert.issuer}{cert.issuer && cert.date ? ' · ' : ''}{cert.date}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {projects.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide font-black text-white bg-[#0f0f0f] inline-block px-3 py-1 mb-3">
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj, idx) => (
                <div key={idx} className="border-l-4 border-[#ffd23f] pl-4">
                  <p className="text-sm font-bold text-slate-900">
                    {proj.name || 'Project'}
                    {proj.link && <span className="font-normal text-slate-500"> — {proj.link}</span>}
                  </p>
                  {proj.description && (
                    <p className="text-sm text-slate-800 leading-snug">{proj.description}</p>
                  )}
                  {proj.bullets?.filter(Boolean).length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {proj.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-sm text-slate-800 leading-snug pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.5em] before:w-2 before:h-2 before:bg-[#ffd23f]">
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

        {skills.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide font-black text-white bg-[#0f0f0f] inline-block px-3 py-1 mb-3">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 bg-[#ffd23f] text-slate-900 font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default BoldTemplate
