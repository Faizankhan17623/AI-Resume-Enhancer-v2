import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaCheck, FaHeart, FaStar, FaTimes, FaCrown } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Footer from '../Home/Footer'
import Loading from '../extra/Loading'
import { GetAllRecruiterPlans } from '../../Services/operations/RecruiterPayment'
import { fadeUp, staggerContainer } from '../../utils/motion'

// Recruiter's own pricing page sir — completely separate plan/payment system from the User
// Pricing.jsx (see Backend/utils/RecruiterPlans.js), same Monthly/Yearly toggle treatment per
// direct request ("do the recruiter one same as the user plans").
const CAPABILITY_MATRIX = [
  { label: 'Active job postings', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'AI-scored applicants', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'Proctored tests', tiers: ['Pro', 'ProMax'] },
  { label: 'AI job-description drafts', tiers: ['Pro', 'ProMax'] },
  { label: 'AI interview-question generator', tiers: ['Pro', 'ProMax'] },
  { label: 'AI candidate summaries', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'Unlimited job postings & AI scoring', tiers: ['ProMax'] },
]

const PLAN_META = {
  Basic: { tagline: 'Enough to try hiring on Resumify for real, no card needed.' },
  Pro: { tagline: 'For an active hiring pipeline — more postings, more AI scoring.' },
  ProMax: { tagline: 'Our highest limits, for high-volume hiring teams.' },
}

const RecruiterPricing = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isLoggedIn } = useSelector((state) => state.auth)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState('monthly')

  useEffect(() => {
    (async () => {
      setLoading(true)
      const result = await dispatch(GetAllRecruiterPlans())
      setPlans(result || [])
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // RecruiterRoute already guarantees a logged-in Recruiter got this far sir (see
  // Hooks/RecruiterRoute.jsx) — no login check needed here, unlike the User side's Pricing.jsx
  // which is reachable by anyone
  const handleBuy = (planKey) => {
    navigate(`/Recruiter/Checkout/${planKey}?cycle=${cycle}`)
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Recruiter Pricing | Resumify</title>
      </Helmet>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full"
      >
        {/* Header sir */}
        <div className="text-center mb-14">
          <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
            RECRUITER PRICING
          </span>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-richblack-5 tracking-tight">
            Hire smarter, <span className="text-warm-200">for less</span>
          </h1>
          <p className="mt-3 text-richblack-200 text-lg">Post jobs, screen with AI, and hire faster.</p>
        </div>

        {!loading && plans.length > 0 && (
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-1 bg-richblack-800 border border-richblack-700 rounded-full p-1">
              <button
                onClick={() => setCycle('monthly')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 cursor-pointer ${
                  cycle === 'monthly' ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-300 hover:text-richblack-5'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle('yearly')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 cursor-pointer flex items-center gap-2 ${
                  cycle === 'yearly' ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-300 hover:text-richblack-5'
                }`}
              >
                Yearly
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  cycle === 'yearly' ? 'bg-richblack-900/20 text-richblack-900' : 'bg-caribgreen-700/30 text-caribgreen-100'
                }`}>
                  Save up to 13%
                </span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Loading text="Loading the plans..." />
        ) : plans.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-200">Could not load the plans — is the server awake?</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4"
          >
            {plans.map((plan) => {
              const isPro = plan.key === 'Pro'
              const isProMax = plan.key === 'ProMax'
              const isCurrent = isLoggedIn && user?.role === 'Recruiter' && (user?.recruiterPlan || 'Basic') === plan.key
              const meta = PLAN_META[plan.key] || {}
              const activeCycle = plan.billingCycles?.[cycle]
              const isFree = !plan.billingCycles

              return (
                <motion.div
                  key={plan.key}
                  variants={fadeUp}
                  className={`relative flex flex-col rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-2 ${
                    isPro
                      ? 'bg-richblack-800 border-warm-200 shadow-[0_0_40px_-12px_rgba(232,131,79,0.35)]'
                      : isProMax
                      ? 'bg-richblack-800 border-yellow-50 shadow-[0_0_40px_-12px_rgba(111,191,168,0.35)]'
                      : 'bg-richblack-800 border-richblack-700 hover:border-richblack-500'
                  }`}
                >
                  {isPro && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 text-xs font-bold rounded-full bg-warm-200 text-richblack-900 whitespace-nowrap">
                      <FaHeart /> MOST POPULAR
                    </span>
                  )}
                  {isProMax && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 text-xs font-bold rounded-full bg-yellow-50 text-richblack-900 whitespace-nowrap">
                      <FaStar /> BEST VALUE
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-richblack-5">{plan.name}</h3>
                  {meta.tagline && (
                    <p className="mt-1.5 text-xs text-richblack-300 leading-relaxed">{meta.tagline}</p>
                  )}

                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-richblack-5 font-mono">
                      {isFree ? 'Free' : `₹${activeCycle?.priceInRupees.toLocaleString('en-IN')}`}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-richblack-300 mb-1">
                        / {cycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {!isFree && (
                    <p className="mt-1 text-[11px] text-richblack-400">
                      ₹{activeCycle?.basePriceInRupees.toLocaleString('en-IN')} + ₹{activeCycle?.gstInRupees.toLocaleString('en-IN')} GST
                      {cycle === 'yearly' ? ', billed once a year' : ', billed monthly'}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-caribgreen-100">
                      {plan.jobPostings === null ? 'Unlimited postings' : `${plan.jobPostings} postings / month`}
                    </span>
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-blue-100">
                      {plan.aiScores === null ? 'Unlimited AI scoring' : `${plan.aiScores} AI scores / month`}
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3 flex-1">
                    {CAPABILITY_MATRIX.map((row, index) => {
                      const included = row.tiers.includes(plan.key)
                      return (
                        <li
                          key={index}
                          className={`flex gap-3 text-sm ${included ? 'text-richblack-100' : 'text-richblack-400/60'}`}
                        >
                          {included ? (
                            <FaCheck className="text-caribgreen-100 mt-0.5 shrink-0" />
                          ) : (
                            <FaTimes className="text-richblack-500 mt-0.5 shrink-0" />
                          )}
                          <span className={included ? '' : 'line-through decoration-richblack-500'}>{row.label}</span>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-8">
                    {isCurrent ? (
                      <button className="w-full py-2.5 text-sm font-bold rounded-full bg-richblack-700 text-caribgreen-100 border border-richblack-600 cursor-default">
                        Your current plan
                      </button>
                    ) : isFree ? (
                      <button
                        onClick={() => navigate(isLoggedIn ? "/Recruiter" : "/Signup")}
                        className="w-full py-2.5 text-sm font-semibold rounded-full text-richblack-100 border border-richblack-600 hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
                      >
                        {isLoggedIn ? "Included free" : "Start free"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(plan.key)}
                        className="w-full py-2.5 text-sm font-bold rounded-full bg-yellow-50 text-richblack-900 hover:brightness-110 transition-all duration-200 cursor-pointer"
                      >
                        Get {plan.name}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      <Footer />
    </div>
  )
}

export default RecruiterPricing
