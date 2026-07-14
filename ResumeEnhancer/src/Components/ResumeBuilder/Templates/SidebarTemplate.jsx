const SidebarTemplate = ({ data }) => {
  const personalInfo = data?.personalInfo || {}
  const experience = data?.experience || []
  const education = data?.education || []
  const skills = data?.skills || []
  const projects = data?.projects || []
  const certifications = data?.certifications || []

  const contactLines = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.website,
  ].filter(Boolean)

  return (
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-900 shadow-2xl print:shadow-none print:m-0 mx-auto flex font-sans">
      {/* Sidebar */}
      <aside className="w-[3in] bg-[#0b2545] text-white px-6 py-10 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold leading-tight break-words">
            {personalInfo.fullName || 'Your Name'}
          </h1>
        </div>

        {contactLines.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">
              Contact
            </h2>
            <ul className="space-y-1">
              {contactLines.map((line, idx) => (
                <li key={idx} className="text-xs text-slate-200 break-words">{line}</li>
              ))}
            </ul>
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-1 bg-white/10 rounded-full text-slate-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">
              Certifications
            </h2>
            <ul className="space-y-2">
              {certifications.map((cert, idx) => (
                <li key={idx} className="text-xs text-slate-200">
                  <p className="font-semibold text-white">{cert.name || 'Certification'}</p>
                  {cert.issuer && <p>{cert.issuer}</p>}
                  {cert.date && <p className="text-slate-400">{cert.date}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Main column */}
      <main className="flex-1 px-8 py-10">
        {data?.summary && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-[#0b2545] font-bold border-b-2 border-[#d4af37] pb-1 mb-2 inline-block">
              Profile
            </h2>
            <p className="text-sm leading-relaxed text-slate-800">{data.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-[#0b2545] font-bold border-b-2 border-[#d4af37] pb-1 mb-3 inline-block">
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-900">
                      {exp.role || 'Role'}{exp.company ? ` — ${exp.company}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 whitespace-nowrap ml-4">
                      {exp.startDate}{exp.startDate && ' - '}{exp.current ? 'Present' : exp.endDate}
                    </p>
                  </div>
                  {exp.location && <p className="text-xs text-slate-500">{exp.location}</p>}
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
            <h2 className="text-sm uppercase tracking-widest text-[#0b2545] font-bold border-b-2 border-[#d4af37] pb-1 mb-3 inline-block">
              Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline">
                  <p className="text-sm text-slate-900">
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

        {projects.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-widest text-[#0b2545] font-bold border-b-2 border-[#d4af37] pb-1 mb-3 inline-block">
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-slate-900">
                    {proj.name || 'Project'}
                    {proj.link && <span className="font-normal text-slate-500"> — {proj.link}</span>}
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
      </main>
    </div>
  )
}

export default SidebarTemplate
