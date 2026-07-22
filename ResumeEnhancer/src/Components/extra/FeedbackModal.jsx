import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaTimes, FaStar, FaCommentDots } from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import { FeedbackApi } from '../../Services/Apis/FeedbackApi'
import { modalBackdrop } from '../../utils/motion'

// in-app feedback popup sir — shows after the 1st completed feature use, then every 2nd
// use after that, until the user submits both the star rating and the referral score.
// the X just closes it for now sir, it comes back on the next qualifying feature use —
// only a real submit stops it for good
const FeedbackModal = () => {
  const { token, isLoggedIn } = useSelector((state) => state.auth)
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [referralScore, setReferralScore] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!isLoggedIn || !token) return
    try {
      const response = await apiConnector('GET', FeedbackApi.status, null, {
        Authorization: `Bearer ${token}`,
      })
      if (response.data.success && response.data.shouldShow) {
        setOpen(true)
      }
    } catch (error) {
      // silent sir — a missed popup check should never disturb the dashboard
      console.error('Error checking feedback status', error)
    }
  }, [isLoggedIn, token])

  // dashboard is a shared shell that never remounts sir, so re-check on every
  // route change — that's what fires right after a feature completes and navigates
  useEffect(() => {
    checkStatus()
  }, [location.pathname, checkStatus])

  const canSubmit = rating > 0 && referralScore !== null

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const response = await apiConnector(
        'POST',
        FeedbackApi.submit,
        { rating, referralScore, reviewText },
        { Authorization: `Bearer ${token}` }
      )
      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      toast.success('Thanks for the feedback!')
      setOpen(false)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not submit your feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setRating(0)
    setHoverRating(0)
    setReviewText('')
    setReferralScore(null)
  }

  // Escape closes the modal sir, same as clicking the backdrop
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
            aria-labelledby="feedback-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[61] inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[92%] max-w-md rounded-2xl bg-richblack-800 border border-richblack-700 p-6 shadow-2xl shadow-richblack-900/50"
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-4 right-4 text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
            >
              <FaTimes className="text-sm" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <FaCommentDots className="text-warm-200 text-lg" aria-hidden="true" />
              <h3 id="feedback-modal-title" className="font-display font-bold text-lg text-richblack-5">How are we doing?</h3>
            </div>
            <p className="text-richblack-300 text-sm mb-5">Your feedback helps us make Resumify better.</p>

            <div className="mb-5">
              <p className="text-sm font-semibold text-richblack-5 mb-2.5" id="feedback-rating-label">How would you rate your experience?</p>
              <div className="flex gap-1.5" role="radiogroup" aria-labelledby="feedback-rating-label">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    className="cursor-pointer p-0.5"
                  >
                    <FaStar
                      aria-hidden="true"
                      className={`text-2xl transition-colors duration-150 ${
                        star <= (hoverRating || rating) ? 'text-warm-200' : 'text-richblack-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="feedback-comment" className="text-sm font-semibold text-richblack-5 mb-2.5 block">
                Anything you'd like to add? <span className="text-richblack-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="feedback-comment"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Tell us what you liked or what we can improve..."
                className="w-full resize-none rounded-xl bg-richblack-700 border border-richblack-600 px-3.5 py-2.5 text-sm text-richblack-5 placeholder:text-richblack-400 outline-none focus:border-warm-200/60 transition-colors duration-200"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-richblack-5 mb-2.5" id="feedback-referral-label">How likely are you to refer Resumify to a friend?</p>
              <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-labelledby="feedback-referral-label">
                {Array.from({ length: 11 }).map((_, n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={referralScore === n}
                    aria-label={`${n} out of 10`}
                    onClick={() => setReferralScore(n)}
                    className={`h-8 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                      referralScore === n
                        ? 'bg-warm-200 text-richblack-900'
                        : 'bg-richblack-700 text-richblack-300 hover:bg-richblack-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-richblack-400">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-3 rounded-xl bg-warm-200 text-richblack-900 font-bold text-sm transition-all duration-200 hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default FeedbackModal
