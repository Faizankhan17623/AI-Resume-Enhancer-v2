const CreativeTemplate = ({ data }) => {
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

  const initials = (personalInfo.fullName || 'Your Name')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-900 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans relative overflow-hidden">
      {/* Accent color blocks */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#ff6b4a]/10 rounded-bl-full" />
      <div className="absolute top-0 left-0 w-3 h-full bg-[#ff6b4a]" />

      <div className="relative px-12 pt-10 pb-8">
        {/* Asymmetric header: photo-placeholder + name off to the side */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-[#ff6b4a] text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md">
            {initials || '?'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">
              {personalInfo.fullName || 'Your Name'}
            </h1>
            {contactParts.length > 0 && (
              <p className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-2">
                {contactParts.map((part, idx) => (
                  <span key={idx}>
                    {part}
                    {idx < contactParts.length - 1 && <span className="text-[#ff6b4a] ml-2">•</span>}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {data?.summary && (
          <section className="mb-8 bg-[#ff6b4a]/5 rounded-lg p-4 border-l-4 border-[#ff6b4a]">
            <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
          </section>
        )}

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            {experience.length > 0 && (
              <section>
                <h2 className="text-sm uppercase tracking-widest text-white bg-[#ff6b4a] inline-block px-3 py-1 rounded-full font-bold mb-4">
                  Experience
                </h2>
                <div className="space-y-4">
                  {experience.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-bold text-slate-900">
                          {exp.role || 'Role'}
                        </p>
                        <p className="text-xs text-[#ff6b4a] font-semibold whitespace-nowrap ml-4">
                          {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'Present' : exp.endDate}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {exp.company}{exp.company && exp.location ? ' · ' : ''}{exp.location}
                      </p>
                      {exp.bullets?.filter(Boolean).length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {exp.bullets.filter(Boolean).map((b, i) => (
                            <li key={i} className="text-sm text-slate-700 leading-snug pl-4 relative before:content-['*'] before:absolute before:left-0 before:text-[#ff6b4a] before:font-bold">
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
              <section>
                <h2 className="text-sm uppercase tracking-widest text-white bg-[#ff6b4a] inline-block px-3 py-1 rounded-full font-bold mb-4">
                  Projects
                </h2>
                <div className="space-y-3">
                  {projects.map((proj, idx) => (
                    <div key={idx}>
                      <p className="text-sm font-bold text-slate-900">
                        {proj.name || 'Project'}
                        {proj.link && <span className="font-normal text-slate-500"> — {proj.link}</span>}
                      </p>
                      {proj.description && (
                        <p className="text-sm text-slate-700 leading-snug">{proj.description}</p>
                      )}
                      {proj.bullets?.filter(Boolean).length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {proj.bullets.filter(Boolean).map((b, i) => (
                            <li key={i} className="text-sm text-slate-700 leading-snug pl-4 relative before:content-['*'] before:absolute before:left-0 before:text-[#ff6b4a] before:font-bold">
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

          <div className="col-span-1 space-y-8">
            {skills.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[#ff6b4a] font-bold mb-3">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-1 border border-[#ff6b4a] text-[#ff6b4a] rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {education.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[#ff6b4a] font-bold mb-3">
                  Education
                </h2>
                <div className="space-y-2">
                  {education.map((edu, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-bold text-slate-900">{edu.school || 'School'}</p>
                      {(edu.degree || edu.field) && (
                        <p className="text-xs text-slate-600">
                          {edu.degree}{edu.degree && edu.field ? ' in ' : ''}{edu.field}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        {edu.startDate}{edu.startDate && ' - '}{edu.endDate}
                        {edu.gpa && ` · GPA ${edu.gpa}`}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {certifications.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[#ff6b4a] font-bold mb-3">
                  Certifications
                </h2>
                <div className="space-y-2">
                  {certifications.map((cert, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-bold text-slate-900">{cert.name || 'Certification'}</p>
                      {cert.issuer && <p className="text-xs text-slate-600">{cert.issuer}</p>}
                      {cert.date && <p className="text-xs text-slate-400">{cert.date}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreativeTemplate
