import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'motion/react'
import { FaCloudUploadAlt, FaFilePdf, FaTimes, FaCopy, FaCrown, FaEnvelope, FaLinkedin } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { GenerateOutreachMessage } from '../../Services/operations/OutreachMessage'
import { setSubject, setBody } from '../../Slices/outreachMessageSlice'

const copyText = (text) => {
  navigator.clipboard.writeText(text)
  toast.success("Copied to clipboard")
}

// which destination the drafted message is shown for sir — the AI always returns both a
// subject + body (see controllers/OutreachMessage.js), this just decides what the UI shows:
// email needs the subject line, a LinkedIn DM has no such field at all
const DESTINATIONS = [
  { id: 'email', label: 'Email', icon: FaEnvelope },
  { id: 'linkedin', label: 'LinkedIn DM', icon: FaLinkedin },
]

const OutreachMessage = () => {
  const [pdfFile, setPdfFile] = useState(null)
  const [jd, setJd] = useState('')
  const [dragging, setDragging] = useState(false)
  const [destination, setDestination] = useState('email')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token, user } = useSelector((state) => state.auth)
  const { subject, body, generating } = useSelector((state) => state.outreachMessage)

  const isBasic = !user?.SubType || user.SubType === 'Basic'

  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The file must be under 5 MB")
      return
    }
    setPdfFile(file)
  }

  const removeFile = () => setPdfFile(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!pdfFile) {
      toast.error("Please upload your resume PDF")
      return
    }
    if (!jd.trim()) {
      toast.error("Please paste the job description")
      return
    }
    dispatch(GenerateOutreachMessage(pdfFile, jd.trim(), token))
  }

  const startOver = () => {
    dispatch(setSubject(''))
    dispatch(setBody(null))
    setPdfFile(null)
    setJd('')
  }

  // same rule as CoverLetter.jsx sir — the result view needs a real way off the page, not just
  // a form reset that leaves the user stuck here
  const closeResult = () => {
    startOver()
    navigate('/Dashboard')
  }

  const copyAll = () => {
    const text = destination === 'email' && subject ? `Subject: ${subject}\n\n${body}` : body
    copyText(text)
  }

  return (
    <DashboardLayout title="Outreach message generator">
      <Helmet>
        <title>Outreach Message | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <AnimatePresence mode="wait">
        {isBasic ? (
          <motion.div key="upsell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
            <FaCrown className="text-3xl text-yellow-50 mx-auto mb-4" />
            <p className="text-richblack-100 mb-2 font-semibold">Outreach messages are a Pro feature</p>
            <p className="text-richblack-300 text-sm mb-6">Upgrade your plan to generate a short, personalized outreach message from your resume and a job description.</p>
            <Link to="/Pricing" state={{ reason: 'outreachMessage' }} className="inline-block">
              <IconBtn text="View plans" />
            </Link>
          </motion.div>
        ) : generating ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loading text="The AI is drafting your outreach message — give it a few seconds..." />
          </motion.div>
        ) : body ? (
          <motion.div key="content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="space-y-5">

            {/* destination toggle sir — switches which fields are shown, doesn't regenerate anything */}
            <div className="flex items-center gap-2">
              {DESTINATIONS.map((d) => {
                const Icon = d.icon
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDestination(d.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer border ${
                      destination === d.id
                        ? 'bg-yellow-50 text-richblack-900 border-yellow-50'
                        : 'bg-richblack-800 text-richblack-300 border-richblack-600 hover:text-richblack-5'
                    }`}
                  >
                    <Icon /> {d.label}
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-richblack-5">Your outreach message</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={copyAll}
                    className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer"
                    title="Copy"
                  >
                    <FaCopy />
                  </button>
                  <button
                    onClick={closeResult}
                    className="text-richblack-300 hover:text-pink-200 transition-colors duration-200 cursor-pointer"
                    title="Close"
                    aria-label="Close"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* subject only shows for email sir — a LinkedIn DM has no subject line at all */}
              {destination === 'email' && subject && (
                <div className="mb-4 pb-4 border-b border-richblack-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-richblack-400 uppercase tracking-wide mb-1">Subject</p>
                      <p className="text-sm font-medium text-richblack-5">{subject}</p>
                    </div>
                    <button
                      onClick={() => copyText(subject)}
                      className="shrink-0 text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer"
                      title="Copy subject"
                    >
                      <FaCopy className="text-sm" />
                    </button>
                  </div>
                </div>
              )}

              <p className="text-sm text-richblack-100 leading-relaxed whitespace-pre-wrap">{body}</p>
              <p className="mt-4 text-xs text-richblack-400">
                {destination === 'email'
                  ? "Ready to paste into an email — subject and body included."
                  : "Ready to paste into a LinkedIn message — just the message, no subject needed there."}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeResult}
                className="px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={startOver}
                className="px-4 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer"
              >
                Write another
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left - PDF dropzone sir */}
            <div>
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">Your resume</label>
              {pdfFile ? (
                <div className="flex items-center justify-between rounded-xl bg-richblack-800 border border-caribgreen-300 p-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FaFilePdf className="text-2xl text-pink-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-richblack-5 truncate">{pdfFile.name}</p>
                      <p className="text-xs text-richblack-400">{(pdfFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-richblack-300 hover:text-pink-200 transition-colors duration-200 cursor-pointer"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${
                    dragging ? 'border-yellow-50 bg-yellow-900/10' : 'border-richblack-600 bg-yellow-900/5 hover:border-richblack-400'
                  }`}
                >
                  <FaCloudUploadAlt className="text-3xl text-yellow-50" />
                  <p className="text-sm text-richblack-100 font-semibold">Drop your PDF here</p>
                  <p className="text-xs text-richblack-400">or click to browse · max 5 MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            {/* Right - JD textarea */}
            <div>
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">Job description</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here — requirements, skills, responsibilities, everything..."
                rows={10}
                className="w-full rounded-xl bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
              />
              <p className="mt-1.5 text-xs text-richblack-400 text-right">{jd.length} characters</p>

              <div className="flex justify-end mt-4">
                <IconBtn type="submit" text="Write my outreach message →" customClasses="px-8 py-3 text-sm" />
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      </PageTransition>
    </DashboardLayout>
  )
}

export default OutreachMessage
