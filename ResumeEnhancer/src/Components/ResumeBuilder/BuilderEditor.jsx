import { useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaPlus, FaTrash, FaDownload, FaSave } from 'react-icons/fa'
import DashboardLayout from '../Dashboard/DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { getTemplateById } from './Templates/templateRegistry'
import { GetBuiltResume, SaveBuiltResume } from '../../Services/operations/BuiltResume'
import { patchCurrentResume } from '../../Slices/builtResumeSlice'

const emptyExperience = () => ({ company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] })
const emptyEducation = () => ({ school: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' })
const emptyProject = () => ({ name: '', description: '', link: '', bullets: [''] })
const emptyCertification = () => ({ name: '', issuer: '', date: '' })

const fieldClass = "w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "text-xs font-semibold text-richblack-300 mb-1 block"
const sectionClass = "rounded-2xl bg-richblack-800 border border-richblack-700 p-5"

const BuilderEditor = () => {
  const { resumeId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { current, loading, saving } = useSelector((state) => state.builtResume)
  const printRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    dispatch(GetBuiltResume(resumeId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId])

  // debounced autosave sir — fires 1.5s after the last edit, silent so it doesn't toast on every keystroke pause
  const scheduleSave = (nextData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dispatch(SaveBuiltResume(resumeId, nextData, token, { silent: true }))
    }, 1500)
  }

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  const patch = (partial) => {
    const next = { ...current, ...partial }
    dispatch(patchCurrentResume(partial))
    scheduleSave(next)
  }

  const patchPersonalInfo = (field, value) => {
    patch({ personalInfo: { ...current.personalInfo, [field]: value } })
  }

  const patchListItem = (listKey, index, field, value) => {
    const list = [...(current[listKey] || [])]
    list[index] = { ...list[index], [field]: value }
    patch({ [listKey]: list })
  }

  const patchBullet = (listKey, itemIndex, bulletIndex, value) => {
    const list = [...(current[listKey] || [])]
    const bullets = [...(list[itemIndex].bullets || [])]
    bullets[bulletIndex] = value
    list[itemIndex] = { ...list[itemIndex], bullets }
    patch({ [listKey]: list })
  }

  const addBullet = (listKey, itemIndex) => {
    const list = [...(current[listKey] || [])]
    list[itemIndex] = { ...list[itemIndex], bullets: [...(list[itemIndex].bullets || []), ''] }
    patch({ [listKey]: list })
  }

  const removeBullet = (listKey, itemIndex, bulletIndex) => {
    const list = [...(current[listKey] || [])]
    list[itemIndex] = { ...list[itemIndex], bullets: list[itemIndex].bullets.filter((_, i) => i !== bulletIndex) }
    patch({ [listKey]: list })
  }

  const addListItem = (listKey, factory) => {
    patch({ [listKey]: [...(current[listKey] || []), factory()] })
  }

  const removeListItem = (listKey, index) => {
    patch({ [listKey]: current[listKey].filter((_, i) => i !== index) })
  }

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    dispatch(SaveBuiltResume(resumeId, current, token))
  }

  const handlePrint = () => {
    window.print()
  }

  const Template = useMemo(() => (current ? getTemplateById(current.templateId).Component : null), [current])

  if (loading || !current) {
    return (
      <DashboardLayout title="Resume builder">
        <Loading text="Loading your resume..." />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={current.title || 'Resume builder'}>
      <Helmet>
        <title>{current.title || 'Resume builder'} | Resumify</title>
      </Helmet>

      {/* print stylesheet sir — hides everything except the preview when the user hits Ctrl+P / our Download button.
          #resume-print-area is rendered by the template itself as its root, sized to a real page (see templateRegistry templates) */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area { position: absolute; top: 0; left: 0; margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="h-full overflow-y-auto px-4 lg:px-6 py-6 animate-fadeIn">
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
          <input
            value={current.title || ''}
            onChange={(e) => patch({ title: e.target.value })}
            className="text-lg font-display font-bold bg-transparent text-richblack-5 focus:outline-none border-b border-transparent focus:border-richblack-600 max-w-xs"
            placeholder="Untitled resume"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <FaSave /> {saving ? 'Saving...' : 'Save'}
            </button>
            <IconBtn text="Download PDF" onclick={handlePrint} customClasses="text-sm px-5">
              <FaDownload />
            </IconBtn>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-8">

          {/* Left — the form sir */}
          <div className="flex flex-col gap-5 print:hidden max-w-2xl">

            <div className={sectionClass}>
              <h3 className="font-semibold text-richblack-5 mb-4">Personal info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Full name</label>
                  <input className={fieldClass} value={current.personalInfo?.fullName || ''} onChange={(e) => patchPersonalInfo('fullName', e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={fieldClass} value={current.personalInfo?.email || ''} onChange={(e) => patchPersonalInfo('email', e.target.value)} placeholder="jane@email.com" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={fieldClass} value={current.personalInfo?.phone || ''} onChange={(e) => patchPersonalInfo('phone', e.target.value)} placeholder="9876543210" />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input className={fieldClass} value={current.personalInfo?.location || ''} onChange={(e) => patchPersonalInfo('location', e.target.value)} placeholder="Bengaluru, India" />
                </div>
                <div>
                  <label className={labelClass}>LinkedIn</label>
                  <input className={fieldClass} value={current.personalInfo?.linkedin || ''} onChange={(e) => patchPersonalInfo('linkedin', e.target.value)} placeholder="linkedin.com/in/janedoe" />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <input className={fieldClass} value={current.personalInfo?.website || ''} onChange={(e) => patchPersonalInfo('website', e.target.value)} placeholder="janedoe.dev" />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="font-semibold text-richblack-5 mb-4">Summary</h3>
              <textarea
                className={`${fieldClass} resize-none`}
                rows={4}
                value={current.summary || ''}
                onChange={(e) => patch({ summary: e.target.value })}
                placeholder="A short professional summary..."
              />
            </div>

            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-richblack-5">Experience</h3>
                <button onClick={() => addListItem('experience', emptyExperience)} className="text-xs font-semibold text-yellow-50 flex items-center gap-1 cursor-pointer hover:opacity-80">
                  <FaPlus className="text-[10px]" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {(current.experience || []).map((exp, i) => (
                  <div key={i} className="rounded-xl bg-richblack-900 border border-richblack-700 p-4">
                    <div className="flex justify-end mb-2">
                      <button onClick={() => removeListItem('experience', i)} className="text-richblack-400 hover:text-pink-200 cursor-pointer">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className={fieldClass} value={exp.role} onChange={(e) => patchListItem('experience', i, 'role', e.target.value)} placeholder="Role" />
                      <input className={fieldClass} value={exp.company} onChange={(e) => patchListItem('experience', i, 'company', e.target.value)} placeholder="Company" />
                      <input className={fieldClass} value={exp.location} onChange={(e) => patchListItem('experience', i, 'location', e.target.value)} placeholder="Location" />
                      <div className="flex gap-2">
                        <input className={fieldClass} value={exp.startDate} onChange={(e) => patchListItem('experience', i, 'startDate', e.target.value)} placeholder="Start" />
                        <input className={fieldClass} value={exp.endDate} onChange={(e) => patchListItem('experience', i, 'endDate', e.target.value)} placeholder="End" />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {(exp.bullets || []).map((bullet, bi) => (
                        <div key={bi} className="flex items-center gap-2">
                          <input
                            className={fieldClass}
                            value={bullet}
                            onChange={(e) => patchBullet('experience', i, bi, e.target.value)}
                            placeholder="Achievement bullet..."
                          />
                          <button onClick={() => removeBullet('experience', i, bi)} className="text-richblack-400 hover:text-pink-200 cursor-pointer shrink-0">
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addBullet('experience', i)} className="text-xs text-yellow-50 flex items-center gap-1 self-start cursor-pointer hover:opacity-80">
                        <FaPlus className="text-[10px]" /> Add bullet
                      </button>
                    </div>
                  </div>
                ))}
                {(current.experience || []).length === 0 && (
                  <p className="text-xs text-richblack-400">No experience added yet.</p>
                )}
              </div>
            </div>

            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-richblack-5">Education</h3>
                <button onClick={() => addListItem('education', emptyEducation)} className="text-xs font-semibold text-yellow-50 flex items-center gap-1 cursor-pointer hover:opacity-80">
                  <FaPlus className="text-[10px]" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {(current.education || []).map((edu, i) => (
                  <div key={i} className="rounded-xl bg-richblack-900 border border-richblack-700 p-4">
                    <div className="flex justify-end mb-2">
                      <button onClick={() => removeListItem('education', i)} className="text-richblack-400 hover:text-pink-200 cursor-pointer">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className={fieldClass} value={edu.school} onChange={(e) => patchListItem('education', i, 'school', e.target.value)} placeholder="School" />
                      <input className={fieldClass} value={edu.degree} onChange={(e) => patchListItem('education', i, 'degree', e.target.value)} placeholder="Degree" />
                      <input className={fieldClass} value={edu.field} onChange={(e) => patchListItem('education', i, 'field', e.target.value)} placeholder="Field of study" />
                      <input className={fieldClass} value={edu.gpa} onChange={(e) => patchListItem('education', i, 'gpa', e.target.value)} placeholder="GPA (optional)" />
                      <input className={fieldClass} value={edu.startDate} onChange={(e) => patchListItem('education', i, 'startDate', e.target.value)} placeholder="Start" />
                      <input className={fieldClass} value={edu.endDate} onChange={(e) => patchListItem('education', i, 'endDate', e.target.value)} placeholder="End" />
                    </div>
                  </div>
                ))}
                {(current.education || []).length === 0 && (
                  <p className="text-xs text-richblack-400">No education added yet.</p>
                )}
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="font-semibold text-richblack-5 mb-4">Skills</h3>
              <input
                className={fieldClass}
                value={(current.skills || []).join(', ')}
                onChange={(e) => patch({ skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="React, Node.js, SQL, AWS (comma separated)"
              />
            </div>

            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-richblack-5">Projects</h3>
                <button onClick={() => addListItem('projects', emptyProject)} className="text-xs font-semibold text-yellow-50 flex items-center gap-1 cursor-pointer hover:opacity-80">
                  <FaPlus className="text-[10px]" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {(current.projects || []).map((proj, i) => (
                  <div key={i} className="rounded-xl bg-richblack-900 border border-richblack-700 p-4">
                    <div className="flex justify-end mb-2">
                      <button onClick={() => removeListItem('projects', i)} className="text-richblack-400 hover:text-pink-200 cursor-pointer">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className={fieldClass} value={proj.name} onChange={(e) => patchListItem('projects', i, 'name', e.target.value)} placeholder="Project name" />
                      <input className={fieldClass} value={proj.link} onChange={(e) => patchListItem('projects', i, 'link', e.target.value)} placeholder="Link (optional)" />
                    </div>
                    <textarea
                      className={`${fieldClass} mt-3 resize-none`}
                      rows={2}
                      value={proj.description}
                      onChange={(e) => patchListItem('projects', i, 'description', e.target.value)}
                      placeholder="Short description"
                    />
                  </div>
                ))}
                {(current.projects || []).length === 0 && (
                  <p className="text-xs text-richblack-400">No projects added yet.</p>
                )}
              </div>
            </div>

            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-richblack-5">Certifications</h3>
                <button onClick={() => addListItem('certifications', emptyCertification)} className="text-xs font-semibold text-yellow-50 flex items-center gap-1 cursor-pointer hover:opacity-80">
                  <FaPlus className="text-[10px]" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {(current.certifications || []).map((cert, i) => (
                  <div key={i} className="rounded-xl bg-richblack-900 border border-richblack-700 p-4 grid grid-cols-3 gap-3">
                    <input className={fieldClass} value={cert.name} onChange={(e) => patchListItem('certifications', i, 'name', e.target.value)} placeholder="Certification" />
                    <input className={fieldClass} value={cert.issuer} onChange={(e) => patchListItem('certifications', i, 'issuer', e.target.value)} placeholder="Issuer" />
                    <div className="flex gap-2">
                      <input className={fieldClass} value={cert.date} onChange={(e) => patchListItem('certifications', i, 'date', e.target.value)} placeholder="Date" />
                      <button onClick={() => removeListItem('certifications', i)} className="text-richblack-400 hover:text-pink-200 cursor-pointer shrink-0">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
                {(current.certifications || []).length === 0 && (
                  <p className="text-xs text-richblack-400">No certifications added yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right — live preview sir, same template component the picker used, real data now */}
          <div ref={printRef} className="print:!block">
            <div className="sticky top-0 origin-top-left scale-[0.55] sm:scale-[0.7] lg:scale-[0.85] print:scale-100 print:static">
              {Template && <Template data={current} />}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default BuilderEditor
