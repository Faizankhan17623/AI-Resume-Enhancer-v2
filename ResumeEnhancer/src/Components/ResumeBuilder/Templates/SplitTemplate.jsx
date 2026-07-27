// accent color convention sir — data.color is a hex string (e.g. "#0b2545"), defaulted per
// template so existing resumes with no color set still render exactly as designed.
// data.photoUrl is an optional Cloudinary secure_url; templates render it in a circular frame
// when present and fall back to initials (or nothing) when it isn't.
const DEFAULT_COLOR = '#e94560'

const getInitials = (name) => {
  if (!name) return ''
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

const SplitTemplate = ({ data }) => {
  const personalInfo = data?.personalInfo || {}
  const experience = data?.experience || []
  const education = data?.education || []
  const skills = data?.skills || []
  const projects = data?.projects || []
  const certifications = data?.certifications || []
  const accent = data?.color || DEFAULT_COLOR
  const photoUrl = data?.photoUrl

  const contactLines = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.website,
  ].filter(Boolean)

  return (
    <div className="w-[8.5in] min-h-[11in] box-border bg-white text-slate-800 shadow-2xl print:shadow-none print:m-0 mx-auto font-sans">
      {/* Two-tone header band sir — dark slab on the left third, name/title on the right two-thirds */}
      <header className="flex">
        <div className="w-1/3 bg-[#1a1a2e] text-white px-6 py-8 flex flex-col justify-center gap-1.5">
          {contactLines.map((line, idx) => (
            <p key={idx} className="text-[11px] text-slate-300 break-words">{line}</p>
          ))}
        </div>
        <div style={{ backgroundColor: accent }} className="w-2/3 text-white px-8 py-8 flex items-center gap-5">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={personalInfo.fullName || 'Profile photo'}
              className="w-20 h-20 rounded-full object-cover border-4 border-white/25 shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/15 border-4 border-white/25 flex items-center justify-center text-xl font-bold shrink-0">
              {getInitials(personalInfo.fullName)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{personalInfo.fullName || 'Your Name'}</h1>
            {data?.summary && (
              <p className="mt-2 text-xs leading-relaxed text-white/85 max-w-md">{data.summary}</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-10 py-9">
        {experience.length > 0 && (
          <section className="mb-7">
            <h2 style={{ color: accent }} className="text-xs uppercase tracking-[0.2em] font-bold mb-4 pb-1.5 border-b border-slate-200">
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-900">
                      {exp.role || 'Role'}{exp.company ? ` — ${exp.company}` : ''}
                    </p>
                    <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
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

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-7">
            {education.length > 0 && (
              <section>
                <h2 style={{ color: accent }} className="text-xs uppercase tracking-[0.2em] font-bold mb-4 pb-1.5 border-b border-slate-200">
                  Education
                </h2>
                <div className="space-y-2.5">
                  {education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-baseline">
                      <p className="text-sm text-slate-900">
                        <span className="font-semibold">{edu.school || 'School'}</span>
                        {edu.degree && ` — ${edu.degree}`}
                        {edu.field && ` in ${edu.field}`}
                        {edu.gpa && <span className="text-slate-500"> (GPA: {edu.gpa})</span>}
                      </p>
                      <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
                        {edu.startDate}{edu.startDate && ' - '}{edu.endDate}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {projects.length > 0 && (
              <section>
                <h2 style={{ color: accent }} className="text-xs uppercase tracking-[0.2em] font-bold mb-4 pb-1.5 border-b border-slate-200">
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
          </div>

          <div className="space-y-7">
            {skills.length > 0 && (
              <section>
                <h2 style={{ color: accent }} className="text-xs uppercase tracking-[0.2em] font-bold mb-3 pb-1.5 border-b border-slate-200">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-1 rounded bg-[#1a1a2e]/5 text-[#1a1a2e] font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {certifications.length > 0 && (
              <section>
                <h2 style={{ color: accent }} className="text-xs uppercase tracking-[0.2em] font-bold mb-3 pb-1.5 border-b border-slate-200">
                  Certifications
                </h2>
                <ul className="space-y-2">
                  {certifications.map((cert, idx) => (
                    <li key={idx} className="text-xs text-slate-700">
                      <p className="font-semibold text-slate-900">{cert.name || 'Certification'}</p>
                      {cert.issuer && <p>{cert.issuer}</p>}
                      {cert.date && <p className="text-slate-400">{cert.date}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SplitTemplate
