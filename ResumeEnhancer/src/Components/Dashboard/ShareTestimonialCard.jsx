import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FaStar, FaCommentDots } from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import { Testimonials as TestimonialsApi } from '../../Services/Apis/AdminApi'

// lets a User or Recruiter share a homepage testimonial sir — Admin/Support never see this, they
// have nothing to review here (mirrors isUserOrRecruiter on the backend). Rendered on both
// Dashboard/Account.jsx and Recruiter/RecruiterAccount.jsx.
const ShareTestimonialCard = () => {
  const { token } = useSelector((state) => state.auth)
  const [mine, setMine] = useState(undefined) // undefined = still loading
  const [role, setRole] = useState('')
  const [quote, setQuote] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchMine = async () => {
      try {
        const response = await apiConnector('GET', TestimonialsApi.mine, null, {
          Authorization: `Bearer ${token}`,
        })
        if (response.data.success) setMine(response.data.testimonial)
      } catch (error) {
        console.error('Error fetching your testimonial', error)
        setMine(null)
      }
    }
    fetchMine()
  }, [token])

  const canSubmit = role.trim() && quote.trim() && rating > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const response = await apiConnector(
        'POST',
        TestimonialsApi.submit,
        { role: role.trim(), quote: quote.trim(), rating },
        { Authorization: `Bearer ${token}` }
      )
      if (!response.data.success) throw new Error(response.data.message)
      toast.success(response.data.message || 'Thanks for sharing!')
      setMine(response.data.testimonial)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not submit your testimonial')
    } finally {
      setSubmitting(false)
    }
  }

  if (mine === undefined) return null

  return (
    <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
      <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
        <FaCommentDots className="text-yellow-50 text-base" /> Share Your Story
      </h2>
      <p className="text-xs text-richblack-400 mb-4">
        Tell other job seekers about your experience — approved stories show up on our homepage.
      </p>

      {mine ? (
        <div className="rounded-lg bg-richblack-900/60 border border-richblack-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
              mine.status === 'approved'
                ? 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700'
                : mine.status === 'rejected'
                ? 'bg-pink-700/20 text-pink-100 border-pink-700'
                : 'bg-yellow-700/20 text-yellow-25 border-yellow-700'
            }`}>
              {mine.status}
            </span>
            <div className="flex gap-0.5 text-warm-200 text-xs">
              {Array.from({ length: mine.rating }).map((_, s) => <FaStar key={s} />)}
            </div>
          </div>
          <p className="text-sm text-richblack-200">"{mine.quote}"</p>
          {mine.status === 'pending' && (
            <p className="text-xs text-richblack-400 mt-2">Awaiting review — we'll feature it once approved.</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Your role (e.g. Frontend Developer)"
            maxLength={100}
            className="w-full rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
          />
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="What was your experience with Resumify?"
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
          />
          <div className="flex gap-1.5" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="cursor-pointer p-0.5"
              >
                <FaStar
                  className={`text-xl transition-colors duration-150 ${
                    star <= (hoverRating || rating) ? 'text-warm-200' : 'text-richblack-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="py-2.5 px-5 rounded-xl bg-yellow-50 text-richblack-900 font-bold text-sm transition-all duration-200 hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ShareTestimonialCard
