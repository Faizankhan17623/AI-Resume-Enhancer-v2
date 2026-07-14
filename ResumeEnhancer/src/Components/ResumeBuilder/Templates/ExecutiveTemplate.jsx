const ExecutiveTemplate = ({ data }) => {
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
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-900 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans">
      {/* Bold header band */}
      <div className="bg-[#3f0d12] text-white px-12 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-3 text-xs text-red-100/80 tracking-wide">
            {contactParts.join('   •   ')}
          </p>
        )}
      </div>

      <div className="px-12 py-8">
        {data?.summary && (
          <section className="mb-6 border-l-4 border-[#3f0d12] pl-4">
            <p className="text-sm leading-relaxed text-slate-800">{data.summary}</p>
          </section>
        )}

        {/* Two-column body */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left main column: experience */}
          <div className="col-span-2">
            {experience.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-widest text-[#3f0d12] font-bold mb-3">
                  Experience
                </h2>
                <div className="space-y-4">
                  {experience.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-bold text-slate-900">
                          {exp.role || 'Role'}
                        </p>
                        <p className="text-xs text-slate-500 whitespace-nowrap ml-4">
                          {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'Present' : exp.endDate}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold">
                        {exp.company}{exp.company && exp.location ? ' | ' : ''}{exp.location}
                      </p>
                      {exp.bullets?.filter(Boolean).length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5">
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

            {projects.length > 0 && (
              <section>
                <h2 className="text-sm uppercase tracking-widest text-[#3f0d12] font-bold mb-3">
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
                        <p className="text-sm text-slate-800 leading-snug">{proj.description}</p>
                      )}
                      {proj.bullets?.filter(Boolean).length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5">
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
          </div>

          {/* Right column: skills, education, certifications */}
          <div className="col-span-1">
            {skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-widest text-[#3f0d12] font-bold mb-3">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-1 bg-[#3f0d12]/10 text-[#3f0d12] rounded font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-widest text-[#3f0d12] font-bold mb-3">
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
                <h2 className="text-sm uppercase tracking-widest text-[#3f0d12] font-bold mb-3">
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

export default ExecutiveTemplate
