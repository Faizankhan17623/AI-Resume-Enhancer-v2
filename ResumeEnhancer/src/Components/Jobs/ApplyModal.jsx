import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { ApplyToJob } from '../../Services/operations/Job'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// same form-field styling as Recruiter/JobBuilder.jsx sir — a candidate-facing form should look
// like every other form in this app, not invent its own visual language
const inputClass = "w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "block text-xs font-semibold text-richblack-200 mb-1.5"

const MAX_RESUME_BYTES = 2 * 1024 * 1024

const emptyEducation = () => ({ degree: 'bachelors', institution: '', startDate: '', endDate: '', currentlyStudying: false })
const emptyWorkHistory = () => ({ companyName: '', startDate: '', endDate: '', currentlyWorking: false })

// the structured, multi-step application form sir — replaces the old one-click "attach a saved
// resume" apply flow. Fresher/experienced branching per direct request: a fresher fills in
// education (bachelor's AND/OR master's), an experienced candidate fills in current CTC + work
// history (both arrays, via the "+ add another" controls also requested). Every application now
// uploads a real PDF resume (<2MB) rather than picking from a saved library.
const ApplyModal = ({ jobId, onClose, onSuccess }) => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [experienceLevel, setExperienceLevel] = useState('fresher')
  const [education, setEducation] = useState([emptyEducation()])
  const [currentCtc, setCurrentCtc] = useState('')
  const [workHistory, setWorkHistory] = useState([emptyWorkHistory()])

  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [expectedSalary, setExpectedSalary] = useState('')

  const [resumeFile, setResumeFile] = useState(null)

  const updateEducation = (index, field, value) => {
    setEducation((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }
  const updateWorkHistory = (index, field, value) => {
    setWorkHistory((prev) => prev.map((w, i) => i === index ? { ...w, [field]: value } : w))
  }

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Resume must be a PDF file')
      e.target.value = ''
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      toast.error('Resume must be under 2MB')
      e.target.value = ''
      return
    }
    setResumeFile(file)
  }

  const validateStep1 = () => {
    if (experienceLevel === 'fresher') {
      if (education.length === 0) return 'Add at least one education entry'
      for (const e of education) {
        if (!e.institution.trim() || !e.startDate) return 'Fill in every education entry'
        if (!e.currentlyStudying && !e.endDate) return 'Add an end date, or mark as currently studying'
      }
    } else {
      if (!currentCtc) return 'Enter your current CTC'
      if (workHistory.length === 0) return 'Add at least one employer'
      for (const w of workHistory) {
        if (!w.companyName.trim() || !w.startDate) return 'Fill in every employer entry'
        if (!w.currentlyWorking && !w.endDate) return 'Add an end date, or mark as your current employer'
      }
    }
    return null
  }

  const validateStep2 = () => {
    if (!expectedSalary) return 'Enter your expected salary'
    return null
  }

  const handleNext = () => {
    const error = step === 1 ? validateStep1() : validateStep2()
    if (error) return toast.error(error)
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    if (!resumeFile) return toast.error('Please attach your resume (PDF, under 2MB)')

    const formPayload = {
      experienceLevel,
      address: { line: addressLine, city, state, pincode },
      expectedSalary: Number(expectedSalary),
      ...(experienceLevel === 'fresher'
        ? { education }
        : { currentCtc: Number(currentCtc), workHistory }),
    }

    const success = await dispatch(ApplyToJob(jobId, token, formPayload, resumeFile, setSubmitting))
    if (success) onSuccess()
  }

  return (
    <AnimatePresence>
      {submitting && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text="Submitting your application..." size="compact" />
        </motion.div>
      )}
      <motion.div
        initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
        className="fixed inset-0 z-[100] bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          variants={modalPanel}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl my-auto"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-richblack-700">
            <div>
              <h2 className="font-display text-lg text-richblack-5">Apply for this role</h2>
              <p className="text-xs text-richblack-400 mt-0.5">Step {step} of 3</p>
            </div>
            <button onClick={onClose} className="text-richblack-300 hover:text-richblack-5 cursor-pointer">
              <FaTimes />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {step === 1 && (
              <>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setExperienceLevel('fresher')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors duration-200 cursor-pointer ${
                      experienceLevel === 'fresher' ? 'bg-yellow-50 text-richblack-900 border-yellow-50' : 'border-richblack-600 text-richblack-200 hover:border-richblack-400'
                    }`}
                  >
                    Fresher
                  </button>
                  <button
                    type="button"
                    onClick={() => setExperienceLevel('experienced')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors duration-200 cursor-pointer ${
                      experienceLevel === 'experienced' ? 'bg-yellow-50 text-richblack-900 border-yellow-50' : 'border-richblack-600 text-richblack-200 hover:border-richblack-400'
                    }`}
                  >
                    Experienced
                  </button>
                </div>

                {experienceLevel === 'fresher' ? (
                  <div className="space-y-4">
                    <p className={labelClass}>Education</p>
                    {education.map((e, i) => (
                      <div key={i} className="rounded-xl border border-richblack-600 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <select
                            value={e.degree}
                            onChange={(ev) => updateEducation(i, 'degree', ev.target.value)}
                            className={`${inputClass} w-auto`}
                          >
                            <option value="bachelors">Bachelor's</option>
                            <option value="masters">Master's</option>
                          </select>
                          {education.length > 1 && (
                            <button type="button" onClick={() => setEducation((prev) => prev.filter((_, idx) => idx !== i))} className="text-pink-200 hover:text-pink-100 cursor-pointer">
                              <FaTrash className="text-xs" />
                            </button>
                          )}
                        </div>
                        <input value={e.institution} onChange={(ev) => updateEducation(i, 'institution', ev.target.value)} placeholder="Institution name" className={inputClass} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Start date</label>
                            <input type="date" value={e.startDate} onChange={(ev) => updateEducation(i, 'startDate', ev.target.value)} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>End date</label>
                            <input type="date" value={e.endDate} disabled={e.currentlyStudying} onChange={(ev) => updateEducation(i, 'endDate', ev.target.value)} className={`${inputClass} disabled:opacity-40`} />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-richblack-200 cursor-pointer">
                          <input type="checkbox" checked={e.currentlyStudying} onChange={(ev) => updateEducation(i, 'currentlyStudying', ev.target.checked)} />
                          Currently studying here
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEducation((prev) => [...prev, emptyEducation()])}
                      className="flex items-center gap-2 text-xs font-semibold text-yellow-50 hover:underline cursor-pointer"
                    >
                      <FaPlus className="text-[10px]" /> Add another education entry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Current CTC (per year)</label>
                      <input type="number" min="0" value={currentCtc} onChange={(e) => setCurrentCtc(e.target.value)} placeholder="e.g. 800000" className={inputClass} />
                    </div>
                    <p className={labelClass}>Work history</p>
                    {workHistory.map((w, i) => (
                      <div key={i} className="rounded-xl border border-richblack-600 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-richblack-400">Employer {i + 1}</span>
                          {workHistory.length > 1 && (
                            <button type="button" onClick={() => setWorkHistory((prev) => prev.filter((_, idx) => idx !== i))} className="text-pink-200 hover:text-pink-100 cursor-pointer">
                              <FaTrash className="text-xs" />
                            </button>
                          )}
                        </div>
                        <input value={w.companyName} onChange={(ev) => updateWorkHistory(i, 'companyName', ev.target.value)} placeholder="Company name" className={inputClass} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Start date</label>
                            <input type="date" value={w.startDate} onChange={(ev) => updateWorkHistory(i, 'startDate', ev.target.value)} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>End date</label>
                            <input type="date" value={w.endDate} disabled={w.currentlyWorking} onChange={(ev) => updateWorkHistory(i, 'endDate', ev.target.value)} className={`${inputClass} disabled:opacity-40`} />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-richblack-200 cursor-pointer">
                          <input type="checkbox" checked={w.currentlyWorking} onChange={(ev) => updateWorkHistory(i, 'currentlyWorking', ev.target.checked)} />
                          I currently work here
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWorkHistory((prev) => [...prev, emptyWorkHistory()])}
                      className="flex items-center gap-2 text-xs font-semibold text-yellow-50 hover:underline cursor-pointer"
                    >
                      <FaPlus className="text-[10px]" /> Add another employer
                    </button>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Address</label>
                  <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Street address" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputClass} />
                </div>
                <input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" className={inputClass} />
                <div>
                  <label className={labelClass}>Expected salary (per year)</label>
                  <input type="number" min="0" value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} placeholder="e.g. 1000000" className={inputClass} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Resume (PDF, under 2MB)</label>
                  <input type="file" accept="application/pdf" onChange={handleResumeChange} className={`${inputClass} file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-yellow-50 file:text-richblack-900 file:text-xs file:font-semibold file:cursor-pointer cursor-pointer`} />
                  {resumeFile && <p className="text-xs text-caribgreen-100 mt-1.5">{resumeFile.name}</p>}
                </div>
                <p className="text-xs text-richblack-400">
                  Your resume is scored against this job automatically — the recruiter sees a fit
                  rating alongside your application.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-richblack-700">
            {step > 1 ? (
              <button onClick={() => setStep((s) => s - 1)} className="px-4 py-2 text-sm text-richblack-300 hover:text-richblack-5 cursor-pointer">
                Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <IconBtn text="Next" onclick={handleNext} customClasses="text-sm" />
            ) : (
              <IconBtn text="Submit application" onclick={handleSubmit} disabled={submitting} customClasses="text-sm" />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ApplyModal
