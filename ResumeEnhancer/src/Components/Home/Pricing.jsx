import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaCheck, FaCrown } from 'react-icons/fa'
import Navbar from './Navbar'
import Footer from './Footer'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { GetAllPlans, BuyPlan } from '../../Services/operations/Payment'

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
        <title>Pricing | ResumeEnhancer</title>
      </Helmet>
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full animate-fadeIn">

        {/* Header sir */}
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-richblack-5 tracking-tight">
            Simple <span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">pricing</span>
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
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-lg hover:brightness-110 transition-all duration-200 cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const isPro = plan.key === 'Pro'
              const isCurrent = token && (user?.SubType || 'Basic') === plan.key

              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-2 ${
                    isPro
                      ? 'bg-richblack-800 border-yellow-50 shadow-[0_0_40px_-12px_rgba(255,214,10,0.35)]'
                      : 'bg-richblack-800 border-richblack-700 hover:border-richblack-500'
                  }`}
                >
                  {/* Most popular ribbon sir */}
                  {isPro && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-200 to-yellow-50 text-richblack-900">
                      <FaCrown /> MOST POPULAR
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-richblack-5">{plan.name}</h3>

                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-richblack-5 font-mono">
                      {plan.priceInRupees === 0 ? 'Free' : `₹${plan.priceInRupees}`}
                    </span>
                    {plan.validityDays && (
                      <span className="text-sm text-richblack-300 mb-1">/ {plan.validityDays} days</span>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex gap-3 text-sm text-richblack-100">
                        <FaCheck className="text-caribgreen-100 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    {isCurrent ? (
                      <button className="w-full py-2.5 text-sm font-bold rounded-lg bg-richblack-700 text-caribgreen-100 border border-richblack-600 cursor-default">
                        Your current plan
                      </button>
                    ) : plan.priceInRupees === 0 ? (
                      <button
                        onClick={() => navigate(token ? "/Dashboard" : "/Signup")}
                        className="w-full py-2.5 text-sm font-semibold rounded-lg text-richblack-100 border border-richblack-600 hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
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
