import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaPlus, FaTrash, FaDownload, FaFileWord, FaSave, FaSwatchbook, FaCheck, FaChartLine, FaTimes, FaHistory, FaUndo } from 'react-icons/fa'
import DashboardLayout from '../Dashboard/DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { modalBackdrop, modalPanel } from '../../utils/motion'
import { TEMPLATE_REGISTRY, getTemplateById } from './Templates/templateRegistry'
import { GetBuiltResume, SaveBuiltResume, ReviewBuiltResume, DownloadBuiltResumeDocx, UploadBuiltResumePhoto, RemoveBuiltResumePhoto, GetBuiltResumeVersions, RestoreBuiltResumeVersion } from '../../Services/operations/BuiltResume'
import { patchCurrentResume } from '../../Slices/builtResumeSlice'

const emptyExperience = () => ({ company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] })
const emptyEducation = () => ({ school: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' })
const emptyProject = () => ({ name: '', description: '', link: '', bullets: [''] })
const emptyCertification = () => ({ name: '', issuer: '', date: '' })

// accent swatches offered per resume sir — each template falls back to its own default hex
// when data.color is empty, these are just the picker's options once the user wants to override it
const ACCENT_SWATCHES = ['#0b2545', '#1d4ed8', '#0f766e', '#b91c1c', '#c2410c', '#7e22ce', '#171717']

const fieldClass = "w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "text-xs font-semibold text-richblack-300 mb-1 block"
const sectionClass = "rounded-2xl bg-richblack-800 border border-richblack-700 p-5"

const BuilderEditor = () => {
  const { resumeId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { current, loading, saving } = useSelector((state) => state.builtResume)
  const { loading: reviewLoading } = useSelector((state) => state.review)
  const printRef = useRef(null)
  const saveTimer = useRef(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [scoreJd, setScoreJd] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef(null)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [restoringId, setRestoringId] = useState(null)

  useEffect(() => {
    dispatch(GetBuiltResume(resumeId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId])

  // debounced autosave sir — fires 1.5s after the last edit, silent so it doesn't toast on every keystroke pause.
  // Stash the latest pending payload in a ref too, so the unmount cleanup below can flush it
  // immediately instead of just cancelling the timer and losing the edit.
  const pendingSaveData = useRef(null)

  // cancels the debounced timer sir — used by every "save immediately instead" handler below,
  // so the pending-save ref never lingers past a save that already happened another way
  const cancelScheduledSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    pendingSaveData.current = null
  }

  const scheduleSave = (nextData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    pendingSaveData.current = nextData
    saveTimer.current = setTimeout(() => {
      pendingSaveData.current = null
      dispatch(SaveBuiltResume(resumeId, nextData, token, { silent: true }))
    }, 1500)
  }

  useEffect(() => {
    return () => {
      // flush sir — if a debounced save was still pending when the user navigated away
      // (quick edit + quick nav, before the 1.5s timer fired), fire it now instead of
      // silently dropping the last edit
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        if (pendingSaveData.current) {
          dispatch(SaveBuiltResume(resumeId, pendingSaveData.current, token, { silent: true }))
          pendingSaveData.current = null
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = (partial) => {
    const next = { ...current, ...partial }
    dispatch(patchCurrentResume(partial))
    scheduleSave(next)
  }

  const patchPersonalInfo = (field, value) => {
    patch({ personalInfo: { ...current.personalInfo, [field]: value } })
  }

  // color is saved immediately sir — a swatch click is one discrete choice, not typing to debounce
  const handlePickColor = (color) => {
    cancelScheduledSave()
    dispatch(patchCurrentResume({ color }))
    dispatch(SaveBuiltResume(resumeId, { ...current, color }, token, { silent: true }))
  }

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // sir — lets picking the same file twice re-trigger onChange
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG or WEBP image")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The file must be under 5 MB")
      return
    }
    setUploadingPhoto(true)
    await dispatch(UploadBuiltResumePhoto(resumeId, file, token))
    setUploadingPhoto(false)
  }

  const handleRemovePhoto = () => {
    dispatch(RemoveBuiltResumePhoto(resumeId, token))
  }

  // opens the version-history dropdown sir — saves whatever's pending first, so the list the
  // user sees (and any restore they do next) reflects the resume as it actually is right now
  const handleOpenVersions = async () => {
    cancelScheduledSave()
    await dispatch(SaveBuiltResume(resumeId, current, token, { silent: true }))
    setVersionsOpen((o) => !o)
    if (!versionsOpen) {
      setVersionsLoading(true)
      const list = await dispatch(GetBuiltResumeVersions(resumeId, token))
      setVersions(list)
      setVersionsLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId) => {
    setRestoringId(versionId)
    const ok = await dispatch(RestoreBuiltResumeVersion(resumeId, versionId, token))
    setRestoringId(null)
    if (ok) setVersionsOpen(false)
  }

  // template swap sir — same data, different renderer. Saves immediately (not debounced like
  // form typing) since picking a template is one discrete click, not a stream of keystrokes.
  const handleSwapTemplate = (templateId) => {
    if (templateId === current.templateId) {
      setTemplatePickerOpen(false)
      return
    }
    cancelScheduledSave()
    dispatch(patchCurrentResume({ templateId }))
    dispatch(SaveBuiltResume(resumeId, { ...current, templateId }, token, { silent: true }))
    setTemplatePickerOpen(false)
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
    cancelScheduledSave()
    dispatch(SaveBuiltResume(resumeId, current, token))
  }

  const handlePrint = () => {
    window.print()
  }

  // ATS-safe export sir — a real .docx (single column, real text, no images), unlike the print-to-PDF button
  const handleDownloadDocx = async () => {
    cancelScheduledSave()
    await dispatch(SaveBuiltResume(resumeId, current, token, { silent: true }))
    DownloadBuiltResumeDocx(resumeId, current.title, token)
  }

  const handleScore = async () => {
    if (!scoreJd.trim()) return
    // save first sir — the score should reflect what's actually in the editor right now, not a stale autosave
    cancelScheduledSave()
    await dispatch(SaveBuiltResume(resumeId, current, token, { silent: true }))
    dispatch(ReviewBuiltResume(resumeId, scoreJd.trim(), token, navigate))
    setScoreModalOpen(false)
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

      <PageTransition className="h-full overflow-y-auto px-4 lg:px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
          <input
            value={current.title || ''}
            onChange={(e) => patch({ title: e.target.value })}
            className="text-lg font-display font-bold bg-transparent text-richblack-5 focus:outline-none border-b border-transparent focus:border-richblack-600 max-w-xs"
            placeholder="Untitled resume"
          />
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setTemplatePickerOpen((o) => !o)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
              >
                <FaSwatchbook /> Change template
              </button>
              <AnimatePresence>
              {templatePickerOpen && (
                <>
                  {/* click-outside catcher sir */}
                  <div className="fixed inset-0 z-40" onClick={() => setTemplatePickerOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 z-50 w-[420px] max-h-96 overflow-y-auto rounded-2xl bg-richblack-800 border border-richblack-600 shadow-2xl p-3 grid grid-cols-3 gap-2.5"
                  >
                    {TEMPLATE_REGISTRY.map((t) => {
                      const active = t.id === current.templateId
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleSwapTemplate(t.id)}
                          className={`relative text-left rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer ${
                            active ? 'border-warm-200 ring-2 ring-warm-200/40' : 'border-richblack-700 hover:border-richblack-500'
                          }`}
                        >
                          <div className="aspect-[3/4] bg-richblack-5 overflow-hidden">
                            <div className="w-full h-full origin-top-left scale-[0.12] pointer-events-none">
                              <t.Component data={current} />
                            </div>
                          </div>
                          {active && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-warm-200 text-richblack-900 flex items-center justify-center">
                              <FaCheck className="text-[8px]" />
                            </span>
                          )}
                          <p className="px-1.5 py-1 text-[10px] font-semibold text-richblack-5 truncate bg-richblack-800">{t.name}</p>
                        </button>
                      )
                    })}
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>
            <div className="relative">
              <button
                onClick={handleOpenVersions}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
              >
                <FaHistory /> Version history
              </button>
              <AnimatePresence>
              {versionsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setVersionsOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl bg-richblack-800 border border-richblack-600 shadow-2xl p-3"
                  >
                    {versionsLoading ? (
                      <p className="text-xs text-richblack-400 text-center py-6">Loading versions...</p>
                    ) : versions.length === 0 ? (
                      <p className="text-xs text-richblack-400 text-center py-6">
                        No earlier versions yet — a snapshot is kept automatically as you edit (at most one every 15 minutes).
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {versions.map((v) => (
                          <div key={v._id} className="flex items-center justify-between gap-2 rounded-xl bg-richblack-900 border border-richblack-700 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm text-richblack-5 truncate">{v.title || 'Untitled resume'}</p>
                              <p className="text-xs text-richblack-400">{new Date(v.savedAt).toLocaleString()}</p>
                            </div>
                            <button
                              onClick={() => handleRestoreVersion(v._id)}
                              disabled={restoringId === v._id}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-yellow-50 border border-richblack-600 rounded-full hover:bg-richblack-800 transition-all duration-200 cursor-pointer disabled:opacity-50"
                            >
                              <FaUndo className="text-[10px]" /> {restoringId === v._id ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <FaSave /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setScoreModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-caribgreen-100 border border-caribgreen-300/40 rounded-full hover:bg-caribgreen-100/10 transition-all duration-200 cursor-pointer"
            >
              <FaChartLine /> Score this resume
            </button>
            <IconBtn text="Download PDF" onclick={handlePrint} customClasses="text-sm px-5">
              <FaDownload />
            </IconBtn>
            <button
              onClick={handleDownloadDocx}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
            >
              <FaFileWord /> Download DOCX
            </button>
          </div>
        </div>

        {/* score modal sir — needs a JD before it can send this resume through the AI Review pipeline */}
        <AnimatePresence>
        {scoreModalOpen && (
          <motion.div
            initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
          >
            <div className="absolute inset-0 bg-richblack-900/80 backdrop-blur-sm" onClick={() => setScoreModalOpen(false)} />
            <motion.div variants={modalPanel} className="relative w-full max-w-lg rounded-2xl bg-richblack-800 border border-richblack-600 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-richblack-5">Score this resume</h3>
                <button onClick={() => setScoreModalOpen(false)} className="text-richblack-400 hover:text-richblack-5 cursor-pointer">
                  <FaTimes />
                </button>
              </div>
              <label className={labelClass}>Paste the job description</label>
              <textarea
                value={scoreJd}
                onChange={(e) => setScoreJd(e.target.value)}
                placeholder="Paste the job description you're targeting..."
                rows={8}
                className={`${fieldClass} resize-none`}
              />
              <p className="mt-2 text-xs text-richblack-400">This runs the same AI ATS review as an uploaded resume and spends one credit.</p>
              <div className="flex justify-end mt-4">
                <IconBtn
                  text={reviewLoading ? "Analyzing..." : "Run ATS review"}
                  onclick={handleScore}
                  disabled={reviewLoading || !scoreJd.trim()}
                  customClasses="text-sm px-6"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

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

              <div className="mt-4 pt-4 border-t border-richblack-700 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {current.photoUrl ? (
                    <img src={current.photoUrl} alt="Headshot" className="w-12 h-12 rounded-full object-cover border border-richblack-600" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-richblack-700 border border-richblack-600" />
                  )}
                  <div>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoFile} />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs font-semibold text-yellow-50 cursor-pointer hover:opacity-80 disabled:opacity-50"
                    >
                      {uploadingPhoto ? 'Uploading...' : current.photoUrl ? 'Change photo' : 'Add photo (optional)'}
                    </button>
                    {current.photoUrl && (
                      <button onClick={handleRemovePhoto} className="block text-xs text-richblack-400 hover:text-pink-200 cursor-pointer mt-0.5">
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Accent color</label>
                  <div className="flex items-center gap-1.5">
                    {ACCENT_SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => handlePickColor(c)}
                        aria-label={`Use accent color ${c}`}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110 ${
                          current.color === c ? 'ring-2 ring-offset-2 ring-offset-richblack-800 ring-warm-200' : ''
                        }`}
                      />
                    ))}
                  </div>
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
                  <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="rounded-xl bg-richblack-900 border border-richblack-700 p-4">
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
                  </motion.div>
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
      </PageTransition>
    </DashboardLayout>
  )
}

export default BuilderEditor
