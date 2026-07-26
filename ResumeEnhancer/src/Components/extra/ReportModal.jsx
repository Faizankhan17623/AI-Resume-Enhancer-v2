import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaTimes, FaBug, FaLightbulb } from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import { ReportApi } from '../../Services/Apis/ReportApi'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// bug report / feature suggestion modal sir — opened on demand from the FAB, unlike
// FeedbackModal this never pops up on its own. Same title+description shape for both
// types, the backend just tags it with `type` so the admin triage queue can filter
const ReportModal = ({ open, onClose }) => {
  const { token } = useSelector((state) => state.auth)

  const [type, setType] = useState('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim().length > 0 && description.trim().length > 0

  const reset = () => {
    setType('bug')
    setTitle('')
    setDescription('')
  }

  const handleClose = () => {
    onClose()
    reset()
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const response = await apiConnector(
        'POST',
        ReportApi.submit,
        { type, title, description },
        { Authorization: `Bearer ${token}` }
      )
      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      toast.success(response.data.message)
      handleClose()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not submit your report')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial="hidden"
            animate="show"
            exit="exit"
            variants={modalBackdrop}
            className="fixed inset-0 z-[60] bg-richblack-900/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            initial="hidden"
            animate="show"
            exit="exit"
            variants={modalPanel}
            className="fixed z-[61] inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[92%] max-w-md rounded-2xl bg-richblack-800 border border-richblack-700 p-6 shadow-2xl shadow-richblack-900/50"
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-4 right-4 text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
            >
              <FaTimes className="text-sm" />
            </button>

            <h3 id="report-modal-title" className="font-display font-bold text-lg text-richblack-5 mb-1">
              Report a bug or suggest a feature
            </h3>
            <p className="text-richblack-300 text-sm mb-5">Tell us what's broken or what you'd love to see next.</p>

            <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Report type">
              <button
                type="button"
                role="radio"
                aria-checked={type === 'bug'}
                onClick={() => setType('bug')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                  type === 'bug'
                    ? 'bg-pink-700/20 border-pink-700 text-pink-100'
                    : 'bg-richblack-700 border-richblack-600 text-richblack-300 hover:text-richblack-5'
                }`}
              >
                <FaBug /> Report a bug
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === 'feature'}
                onClick={() => setType('feature')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                  type === 'feature'
                    ? 'bg-caribgreen-700/30 border-caribgreen-700 text-caribgreen-25'
                    : 'bg-richblack-700 border-richblack-600 text-richblack-300 hover:text-richblack-5'
                }`}
              >
                <FaLightbulb /> Suggest a feature
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="report-title" className="text-sm font-semibold text-richblack-5 mb-2 block">
                {type === 'bug' ? 'What went wrong?' : 'What\'s your idea?'}
              </label>
              <input
                id="report-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                placeholder={type === 'bug' ? 'e.g. Resume upload fails on Safari' : 'e.g. Dark mode for the resume builder'}
                className="w-full rounded-xl bg-richblack-700 border border-richblack-600 px-3.5 py-2.5 text-sm text-richblack-5 placeholder:text-richblack-400 outline-none focus:border-warm-200/60 transition-colors duration-200"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="report-description" className="text-sm font-semibold text-richblack-5 mb-2 block">
                Details
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={type === 'bug' ? 'Steps to reproduce, what you expected, what happened instead...' : 'Describe how it would work and why it would help...'}
                className="w-full resize-none rounded-xl bg-richblack-700 border border-richblack-600 px-3.5 py-2.5 text-sm text-richblack-5 placeholder:text-richblack-400 outline-none focus:border-warm-200/60 transition-colors duration-200"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-3 rounded-xl bg-warm-200 text-richblack-900 font-bold text-sm transition-all duration-200 hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Submitting...' : type === 'bug' ? 'Submit bug report' : 'Submit suggestion'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ReportModal
