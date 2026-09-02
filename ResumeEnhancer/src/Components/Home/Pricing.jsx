import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaCheck, FaHeart, FaStar, FaTimes, FaCrown } from 'react-icons/fa'
import Navbar from './Navbar'
import Footer from './Footer'
import Loading from '../extra/Loading'
import { GetAllPlans } from '../../Services/operations/Payment'
import { fadeUp, staggerContainer } from '../../utils/motion'

// full capability matrix sir — one row per real capability across ALL plans, so every
// card can show both what it has (check) and what it's missing versus the tier above it.
// Kept in the same order the API returns each plan's own features, deduped by rough grouping.
const CAPABILITY_MATRIX = [
  { label: 'AI-powered ATS resume reviews', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'AI Coach chat', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'Free grammar/spelling pre-check', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'ATS formatting scan (structural check)', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'Standard response speed', tiers: ['Basic'] },
  { label: 'Faster response speed', tiers: ['Pro'] },
  { label: 'Fastest response speed, no wait', tiers: ['ProMax'] },
  { label: 'Core ATS review with top 3 fixes', tiers: ['Basic'] },
  { label: 'Deep review: keyword analysis, section feedback, quick wins', tiers: ['Pro', 'ProMax'] },
  { label: 'Full bullet/section rewrites', tiers: ['Pro', 'ProMax'] },
  { label: 'AI cover letter generator', tiers: ['Pro', 'ProMax'] },
  { label: 'Job search (Tavily-powered)', tiers: ['Pro', 'ProMax'] },
  { label: 'Recruiter first-impression + red flags', tiers: ['ProMax'] },
  { label: 'Interview prep + learning roadmap', tiers: ['ProMax'] },
  { label: 'Full career coach: mock interviews, salary negotiation, LinkedIn', tiers: ['ProMax'] },
  { label: 'Highest limits: 300 AI uses & 500 msgs/chat', tiers: ['ProMax'] },
]

// context-aware banner sir — shown only when a caller navigates here WITH a reason (see
// Dashboard/NewReview.jsx's UpgradeUpsell and DashboardHome.jsx's credits pill, both pass
// `state: { reason: 'credits' }`). A plain /Pricing visit (Navbar link, Footer, etc.) has no
// location.state and shows nothing extra — this is additive, never the only way to reach the page.
const REASON_BANNERS = {
  credits: "You've used all your free AI reviews — here's what upgrading unlocks.",
  coverLetter: 'Cover letters are a Pro feature — here\'s what upgrading unlocks.',
  jobSearch: 'Job search is a Pro feature — here\'s what upgrading unlocks.',
  mockInterview: 'Mock interviews are a Pro Max feature — here\'s what upgrading unlocks.',
}

const PLAN_META = {
  Basic: {
    tagline: 'Enough to try it for real, no card needed.',
    credits: '5 AI uses / month',
    messages: '50 messages / chat',
    aiModel: 'gpt-oss-20b',
  },
  Pro: {
    tagline: 'For an active job search — go deep on every application.',
    credits: '100 AI uses / month',
    messages: '250 messages / chat',
    aiModel: 'gpt-oss-20b',
  },
  ProMax: {
    tagline: 'Our highest limits, plus a full career coach.',
    credits: '300 AI uses / month',
    messages: '500 messages / chat',
    aiModel: 'gpt-oss-120b',
  },
}

const Pricing = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const reasonBanner = REASON_BANNERS[location.state?.reason]
  const { plans, loading } = useSelector((state) => state.payment)
  const { user, isLoggedIn } = useSelector((state) => state.auth)
  // 'monthly' | 'yearly' sir — per direct request, same toggle pattern as the reference pricing
  // page. Basic ignores this entirely (it's free, no billingCycles at all).
  const [cycle, setCycle] = useState('monthly')

  useEffect(() => {
    dispatch(GetAllPlans())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sends the candidate to the new pre-payment review page instead of straight to Razorpay sir —
  // per direct request, matching the reference screenshots' separate Order-details/checkout
  // step. The actual purchase (BuyPlan) now lives entirely in PlanCheckout.jsx; this page's job
  // is just picking a plan + cycle and handing that choice off.
  const handleBuy = (planKey) => {
    // not logged in sir — same "go log in first" pattern as everywhere else in this app that
    // gates an action behind login (e.g. Jobs/JobDetail.jsx's Apply click); this app's login
    // flow has no generic "return to where you came from" redirect, so plain /Login it is
    if (!isLoggedIn) {
      navigate("/Login")
      return
    }
    navigate(`/Checkout/${planKey}?cycle=${cycle}`)
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Pricing | Resumify</title>
      </Helmet>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full"
      >

        {reasonBanner && (
          <div className="max-w-xl mx-auto mb-8 flex items-center justify-center gap-2.5 rounded-xl bg-yellow-900/10 border border-yellow-800/40 px-5 py-3 text-center">
            <FaCrown className="text-yellow-50 shrink-0" />
            <p className="text-sm text-yellow-25">{reasonBanner}</p>
          </div>
        )}

        {/* Header sir */}
        <div className="text-center mb-14">
          <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
            PRICING
          </span>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-richblack-5 tracking-tight">
            Simple <span className="text-warm-200">pricing</span>
          </h1>
          <p className="mt-3 text-richblack-200 text-lg">Start free. Upgrade when your job hunt gets serious.</p>
        </div>

        {/* Monthly/Yearly toggle sir — one shared choice for every paid plan on the page, same
            idea as the reference pricing page's per-card toggle, just placed once above the
            cards instead of duplicated in each. Basic ignores this (it's free either way). */}
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
                  Save up to 17%
                </span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Loading text="Loading the plans..." />
        ) : plans.length === 0 ? (
          // never a silent blank space sir — if the fetch fails the user sees why
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-200">Could not load the plans — is the server awake?</p>
            <button
              onClick={() => dispatch(GetAllPlans())}
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
              // plan tiers are a User-only concept sir — an Admin/Support account has no
              // real plan, never mark any tier as "current" for them
              const isCurrent = isLoggedIn && user?.role === 'User' && (user?.SubType || 'Basic') === plan.key
              const meta = PLAN_META[plan.key] || {}
              // Basic has no billingCycles at all sir (it's free) — everything below falls back
              // to the plain priceInRupees:0 shape getPlans returns for it
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
                  {/* Ribbon badges sir — most popular (coral) / best value (teal), MyPerfectResume-style */}
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

                  {/* Credits + message-cap chips sir — the two numbers people actually compare plans on */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {meta.credits && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-caribgreen-100">
                        {meta.credits}
                      </span>
                    )}
                    {meta.messages && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-blue-100">
                        {meta.messages}
                      </span>
                    )}
                    {meta.aiModel && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-warm-200">
                        AI model: {meta.aiModel}
                      </span>
                    )}
                  </div>

                  {/* Full capability matrix sir — every row the plan HAS gets a check,
                      every row it's MISSING (that a higher tier has) gets a greyed-out cross */}
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
                        onClick={() => navigate(isLoggedIn ? "/Dashboard" : "/Signup")}
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

export default Pricing
