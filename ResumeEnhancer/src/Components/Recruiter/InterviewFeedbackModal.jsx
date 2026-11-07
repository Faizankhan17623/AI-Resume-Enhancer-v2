import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaTimes, FaStar } from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import { InterviewApi } from '../../Services/Apis/InterviewApi'
import { modalBackdrop, modalPanel } from '../../utils/motion'
import Loading from '../extra/Loading'

const RECOMMENDATIONS = [
  { value: 'strong_yes', label: 'Strong yes', className: 'border-caribgreen-700 text-caribgreen-100 data-[active=true]:bg-caribgreen-700/20' },
  { value: 'yes', label: 'Yes', className: 'border-blue-700 text-blue-100 data-[active=true]:bg-blue-700/20' },
  { value: 'no', label: 'No', className: 'border-warm-600 text-warm-25 data-[active=true]:bg-warm-700/20' },
  { value: 'strong_no', label: 'Strong no', className: 'border-pink-700 text-pink-100 data-[active=true]:bg-pink-700/20' },
]

// post-interview scorecard sir, per direct request — closes the gap where a recruiter could
// flip an application's status to hired/rejected with no record of why. Self-contained like
// ScheduleInterviewModal: fetches the interview thread itself on open (the applicants list
// doesn't carry per-row interview status), so this works from a single "Interview feedback"
// button without the list needing a new per-row fetch. Only usable once the candidate actually
// confirmed a slot (see Models/InterviewSchedule.js's feedback field comment) — the loaded
// schedule's own status is the real gate, this just renders accordingly instead of guessing.
const InterviewFeedbackModal = ({ applicationId, onClose }) => {
  const { token } = useSelector((s) => s.auth)
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  const [recommendation, setRecommendation] = useState('')
  const [rating, setRating] = useState(0)
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiConnector('GET', `${InterviewApi.getInterviewForApplication}/${applicationId}/interview`, null, {
          Authorization: `Bearer ${token}`,
        })
        if (!r.data.success) throw new Error(r.data.message)
        setSchedule(r.data.schedule)
        const existing = r.data.schedule?.feedback
        if (existing?.submittedAt) {
          setRecommendation(existing.recommendation || '')
          setRating(existing.rating || 0)
          setStrengths(existing.strengths || '')
          setConcerns(existing.concerns || '')
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || error.message || 'Could not load this interview')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!recommendation || !rating) {
      toast.error('Pick a recommendation and a rating')
      return
    }
    setBusy(true)
    try {
      const r = await apiConnector('POST', `${InterviewApi.submitFeedback}/${schedule._id}/feedback`, {
        recommendation,
        rating,
        strengths: strengths.trim() || undefined,
        concerns: concerns.trim() || undefined,
      }, { Authorization: `Bearer ${token}` })
      if (!r.data.success) throw new Error(r.data.message)
      toast.success('Feedback saved')
      onClose()
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Could not save feedback')
    } finally {
      setBusy(false)
    }
  }

  const notReady = !loading && (!schedule || schedule.status !== 'confirmed')

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
        className="fixed inset-0 z-[70] bg-[#17140F]/80 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalPanel}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-richblack-5">Interview feedback</h2>
            <button onClick={onClose} className="text-richblack-400 hover:text-richblack-5 cursor-pointer p-1">
              <FaTimes />
            </button>
          </div>

          {loading ? (
            <Loading text="Loading..." size="compact" />
          ) : notReady ? (
            <p className="text-sm text-richblack-300 py-6 text-center">
              {schedule?.status === 'proposed'
                ? "The candidate hasn't confirmed an interview slot yet."
                : schedule
                  ? 'This interview was cancelled or expired before feedback could be left.'
                  : 'No interview has been scheduled for this candidate yet.'}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-richblack-400 mb-1.5 block">Recommendation</label>
                <div className="grid grid-cols-2 gap-2">
                  {RECOMMENDATIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      data-active={recommendation === r.value}
                      onClick={() => setRecommendation(r.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-semibold cursor-pointer transition-colors duration-200 ${r.className} ${recommendation === r.value ? '' : 'bg-richblack-900'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-richblack-400 mb-1.5 block">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="p-1 cursor-pointer"
                      title={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <FaStar className={n <= rating ? 'text-yellow-50' : 'text-richblack-600'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-richblack-400 mb-1 block">Strengths (optional)</label>
                <textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className="w-full min-h-16 rounded-lg bg-richblack-900 border border-richblack-700 p-3 text-sm text-richblack-5"
                />
              </div>

              <div>
                <label className="text-xs text-richblack-400 mb-1 block">Concerns (optional)</label>
                <textarea
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  className="w-full min-h-16 rounded-lg bg-richblack-900 border border-richblack-700 p-3 text-sm text-richblack-5"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-richblack-900 cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save feedback'}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InterviewFeedbackModal
