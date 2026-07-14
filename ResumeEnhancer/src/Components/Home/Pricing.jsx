import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaCheck, FaHeart, FaStar, FaTimes } from 'react-icons/fa'
import Navbar from './Navbar'
import Footer from './Footer'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { GetAllPlans, BuyPlan } from '../../Services/operations/Payment'

// full capability matrix sir — one row per real capability across ALL plans, so every
// card can show both what it has (check) and what it's missing versus the tier above it.
// Kept in the same order the API returns each plan's own features, deduped by rough grouping.
const CAPABILITY_MATRIX = [
  { label: 'AI-powered ATS resume reviews', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'AI Coach chat', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'Free grammar/spelling pre-check', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'ATS formatting scan (structural check)', tiers: ['Basic', 'Pro', 'ProMax'] },
  { label: 'Core ATS review with top 3 fixes', tiers: ['Basic'] },
  { label: 'Deep review: keyword analysis, section feedback, quick wins', tiers: ['Pro', 'ProMax'] },
  { label: 'Full bullet/section rewrites', tiers: ['Pro', 'ProMax'] },
  { label: 'AI cover letter generator', tiers: ['Pro', 'ProMax'] },
  { label: 'Job search (Tavily-powered)', tiers: ['Pro', 'ProMax'] },
  { label: 'Recruiter first-impression + red flags', tiers: ['ProMax'] },
  { label: 'Interview prep + learning roadmap', tiers: ['ProMax'] },
  { label: 'Full career coach: mock interviews, salary negotiation, LinkedIn', tiers: ['ProMax'] },
  { label: 'Unlimited AI uses & chat messages', tiers: ['ProMax'] },
]

const PLAN_META = {
  Basic: {
    tagline: 'Enough to try it for real, no card needed.',
    credits: '5 AI uses',
    messages: '60 messages / chat',
  },
  Pro: {
    tagline: 'For an active job search — go deep on every application.',
    credits: '100 AI uses / month',
    messages: '200 messages / chat',
  },
  ProMax: {
    tagline: 'Unlimited everything, plus a full career coach.',
    credits: 'Unlimited AI uses',
    messages: 'Unlimited messages',
  },
}

const Pricing = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { plans, loading } = useSelector((state) => state.payment)
  const { token, user } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(GetAllPlans())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBuy = (planKey) => {
    // not logged in sir — the purchase needs an account first
    if (!token) {
      navigate("/Login")
      return
    }
    dispatch(BuyPlan(planKey, token, user, navigate))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Pricing | Resumify</title>
      </Helmet>
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full animate-fadeIn">

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

        {loading ? (
          <Loading text="Loading the plans..." />
        ) : plans.length === 0 ? (
          // never a silent blank space sir — if the fetch fails the user sees why
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center">
            <p className="text-richblack-200">Could not load the plans — is the server awake?</p>
            <button
              onClick={() => dispatch(GetAllPlans())}
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
            {plans.map((plan) => {
              const isPro = plan.key === 'Pro'
              const isProMax = plan.key === 'ProMax'
              const isCurrent = token && (user?.SubType || 'Basic') === plan.key
              const meta = PLAN_META[plan.key] || {}

              return (
                <div
                  key={plan.key}
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
                      {plan.priceInRupees === 0 ? 'Free' : `₹${plan.priceInRupees}`}
                    </span>
                    {plan.validityDays && (
                      <span className="text-sm text-richblack-300 mb-1">/ {plan.validityDays} days</span>
                    )}
                  </div>

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
                    ) : plan.priceInRupees === 0 ? (
                      <button
                        onClick={() => navigate(token ? "/Dashboard" : "/Signup")}
                        className="w-full py-2.5 text-sm font-semibold rounded-full text-richblack-100 border border-richblack-600 hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
                      >
                        {token ? "Included free" : "Start free"}
                      </button>
                    ) : (
                      <IconBtn
                        text={`Get ${plan.name}`}
                        onclick={() => handleBuy(plan.key)}
                        customClasses="w-full justify-center"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default Pricing
