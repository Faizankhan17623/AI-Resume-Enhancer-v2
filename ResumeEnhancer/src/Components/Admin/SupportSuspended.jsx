import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaLock, FaPaperPlane, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import { fadeUp } from '../../utils/motion'
import { SubmitSuspensionAppeal } from '../../Services/operations/User'

// the ONLY page a suspended Support account can reach sir — SupportRoute.jsx redirects every
// other /Support/* route here the moment user.isBanned is true, same rule PrivateRoute/
// Suspended.jsx already enforces for a regular User, just without DashboardLayout's User-only
// sidebar (Overview/Resumes/Coach etc — none of that applies to a Support account). The backend
// enforces the same lock server-side on every route except POST /appeal-suspension (Backend/
// Middlewares/Auth.js), regardless of role.
//
// Support gets exactly ONE appeal per suspension, ever (Backend/controllers/user.js's
// submitSuspensionAppeal, Models/User.js's supportAppealUsed) — once that one appeal is
// reviewed and the account is still banned, there is no second attempt; this page reflects
// that directly instead of just re-showing the same form.
const SupportSuspended = () => {
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const appealStatus = user?.suspensionAppealStatus
  // 'reviewed' + Support role + still banned (this page only renders while banned) means the
  // one shot has already been used and the outcome wasn't reinstatement sir — final.
  const appealExhausted = appealStatus === 'reviewed'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    const ok = await dispatch(SubmitSuspensionAppeal(message.trim(), token))
    setSubmitting(false)
    if (ok) setMessage('')
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Account Suspended | Resumify</title>
      </Helmet>
      <Navbar />

      <div className="max-w-lg mx-auto px-4 lg:px-8 py-16">
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-pink-900/15 flex items-center justify-center mx-auto mb-4">
              <FaLock className="text-2xl text-pink-100" />
            </div>
            <h2 className="font-display text-2xl text-richblack-5">Your Support account has been suspended</h2>
            <p className="text-sm text-richblack-300 mt-1.5">
              An admin has restricted access to your account. Every other page is locked until this is resolved.
            </p>
          </div>

          <div className="rounded-2xl bg-richblack-800 border border-richblack-700 p-8">
            <div className="rounded-lg border border-pink-700 bg-pink-700/10 p-3 mb-6 text-xs text-pink-100">
              <span className="font-semibold">Reason given by admin: </span>
              {user?.banReason || 'No reason was provided.'}
            </div>

            {appealExhausted ? (
              <div className="text-center py-4">
                <FaTimesCircle className="text-3xl text-pink-200 mx-auto mb-3" />
                <p className="text-richblack-5 font-semibold mb-1.5">This suspension is final</p>
                <p className="text-sm text-richblack-300">
                  Your one appeal for a Support account was reviewed and this decision stands. There is no further appeal available for this suspension.
                </p>
              </div>
            ) : appealStatus === 'pending' ? (
              <div className="text-center py-4">
                <FaCheckCircle className="text-3xl text-caribgreen-100 mx-auto mb-3" />
                <p className="text-richblack-5 font-semibold mb-1.5">Your appeal has been sent</p>
                <p className="text-sm text-richblack-300">
                  An admin will review your message. This is your one and only appeal for this suspension, so make sure it says everything you need it to.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-richblack-300">
                  Think this was a mistake? Explain why your account should be un-suspended — an admin will review it. <span className="text-yellow-50 font-semibold">You get one appeal for this suspension, so use it carefully.</span>
                </p>
                <div>
                  <label className="block text-xs font-semibold text-richblack-200 mb-1.5">
                    Your message <span className="text-pink-200">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Explain why you believe your account should be restored..."
                    required
                    maxLength={2000}
                    className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FaPaperPlane className="text-xs" /> {submitting ? 'Sending...' : 'Submit your one appeal'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default SupportSuspended
