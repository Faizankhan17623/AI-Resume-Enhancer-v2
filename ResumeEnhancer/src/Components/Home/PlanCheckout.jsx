import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaCheckCircle, FaShieldAlt, FaLock } from 'react-icons/fa'
import Navbar from './Navbar'
import Footer from './Footer'
import Loading from '../extra/Loading'
import { GetAllPlans } from '../../Services/operations/Payment'
import { BuyPlan } from '../../Services/operations/Payment'

// pre-payment review/order-details page sir — the separate step the reference screenshots
// showed between "pick a plan" (Pricing.jsx) and actually opening Razorpay: pick monthly vs
// yearly (again, changeable here too), see the exact GST breakdown and total due today, an
// auto-renew disclosure, and a final Subscribe button. All the real purchase logic (Razorpay
// script + create-order + verify) still lives in Services/operations/Payment.js's BuyPlan —
// this page is just a UI wrapper that calls it with the chosen billingCycle.
const PLAN_LABELS = {
  Pro: 'Pro',
  ProMax: 'Pro Max',
}

const PlanCheckout = () => {
  const { planKey } = useParams()
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { plans, loading } = useSelector((state) => state.payment)
  const { user, token, isLoggedIn } = useSelector((state) => state.auth)

  const initialCycle = searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly'
  const [cycle, setCycle] = useState(initialCycle)
  const [agreed, setAgreed] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyingText, setBuyingText] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/Login')
      return
    }
    if (plans.length === 0) dispatch(GetAllPlans())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const plan = plans.find((p) => p.key === planKey)
  const cycleData = plan?.billingCycles?.[cycle]

  // next-renewal date sir, per direct request — "17 August 2026" style (day, full month name,
  // year), computed as today + this cycle's validityDays. Same format the backend's
  // PlanExpiryReminderCron.js emails use (en-GB with these options renders exactly this way), so
  // the date shown here always matches what the reminder emails will later say.
  const renewalDateFormatted = cycleData
    ? new Date(Date.now() + cycleData.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const handleLoadingChange = (isLoading, text) => {
    setBuying(isLoading)
    setBuyingText(text || '')
  }

  const handleSubscribe = () => {
    if (!plan || !cycleData || !agreed) return
    dispatch(BuyPlan(planKey, token, user, navigate, handleLoadingChange, cycle))
  }

  // invalid/unknown plan key sir (e.g. someone typed /Checkout/Basic by hand — Basic is free,
  // has no billingCycles, nothing to check out here)
  const isInvalidPlan = !loading && plans.length > 0 && (!plan || !plan.billingCycles)

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Checkout | Resumify</title>
      </Helmet>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-3xl mx-auto px-6 py-14 w-full"
      >
        {loading ? (
          <Loading text="Loading the plan..." />
        ) : isInvalidPlan ? (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-200">That plan doesn't exist, or isn't a paid plan.</p>
            <button
              onClick={() => navigate('/Pricing')}
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer"
            >
              Back to pricing
            </button>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center">
              <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
                CHECKOUT
              </span>
              <h1 className="font-display font-bold text-3xl lg:text-4xl text-richblack-5 tracking-tight">
                Subscribe to {PLAN_LABELS[planKey] || planKey}
              </h1>
              <p className="mt-3 text-richblack-200">Review your plan and billing cycle before you pay.</p>
            </div>

            {/* Monthly / Yearly selectable cards sir — same idea as the reference screenshots'
                checkout step, letting the candidate change their mind about cycle right here too */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {['monthly', 'yearly'].map((c) => {
                const data = plan?.billingCycles?.[c]
                if (!data) return null
                const selected = cycle === c
                return (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className={`text-left rounded-2xl p-5 border transition-all duration-200 cursor-pointer ${
                      selected
                        ? 'bg-richblack-800 border-yellow-50 shadow-[0_0_30px_-12px_rgba(111,191,168,0.35)]'
                        : 'bg-richblack-800 border-richblack-700 hover:border-richblack-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-richblack-5 capitalize">{c}</span>
                      {selected && <FaCheckCircle className="text-caribgreen-100" />}
                    </div>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-2xl font-extrabold text-richblack-5 font-mono">
                        ₹{data.priceInRupees.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-richblack-300 mb-0.5">/ {c === 'yearly' ? 'year' : 'month'}</span>
                    </div>
                    {c === 'yearly' && (
                      <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-caribgreen-700/30 text-caribgreen-100">
                        Save up to 17% vs monthly
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Order details sir — the exact base + GST + total breakdown from the reference screenshots */}
            <div className="rounded-2xl bg-richblack-800 border border-richblack-700 p-6 mb-6">
              <h2 className="text-sm font-bold text-richblack-5 mb-4">Order details</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-richblack-200">
                  <span>{PLAN_LABELS[planKey] || planKey} — {cycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                  <span>₹{cycleData?.basePriceInRupees.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-richblack-400">
                  <span>GST (18%)</span>
                  <span>₹{cycleData?.gstInRupees.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-richblack-700 my-2"></div>
                <div className="flex justify-between text-richblack-5 font-bold text-base">
                  <span>Total due today</span>
                  <span>₹{cycleData?.priceInRupees.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Auto-renew disclosure sir — one-time charge (Razorpay order, not a subscription
                API), so this is disclosure of what happens at the END of the cycle, not an
                actual recurring mandate. Matches this app's one-time-order architecture. */}
            <div className="rounded-2xl bg-richblack-800/60 border border-richblack-700 p-5 mb-6 flex gap-3">
              <FaShieldAlt className="text-warm-200 mt-0.5 shrink-0" />
              <p className="text-xs text-richblack-300 leading-relaxed">
                This is a one-time charge for your {cycle === 'yearly' ? 'full year' : 'month'} of access.
                Your plan will not renew automatically — it's valid until{' '}
                <strong className="text-richblack-100">{renewalDateFormatted}</strong>. We'll email you
                7, 3 and 1 day before that date, and again on the day it expires, so you can renew at the
                then-current price of ₹{cycleData?.priceInRupees.toLocaleString('en-IN')}. No card is stored.
              </p>
            </div>

            {/* Payment method sir */}
            <div className="rounded-2xl bg-richblack-800 border border-richblack-700 p-5 mb-6">
              <h2 className="text-sm font-bold text-richblack-5 mb-2">Payment method</h2>
              <p className="text-xs text-richblack-300">
                Cards, UPI, netbanking and wallets via Razorpay's secure checkout — you'll pick one on the next step.
              </p>
            </div>

            <label className="flex items-start gap-2.5 mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 accent-yellow-50 cursor-pointer"
              />
              <span className="text-xs text-richblack-300 leading-relaxed">
                I agree this is a one-time charge of ₹{cycleData?.priceInRupees.toLocaleString('en-IN')} for{' '}
                {cycle === 'yearly' ? 'one year' : 'one month'} of {PLAN_LABELS[planKey] || planKey}, and I've read
                the Refund Policy.
              </span>
            </label>

            <button
              onClick={handleSubscribe}
              disabled={!agreed || buying}
              className="w-full py-3 text-sm font-bold rounded-full bg-yellow-50 text-richblack-900 hover:brightness-110 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <FaLock className="text-xs" />
              {buying ? (buyingText || 'Setting up...') : `Subscribe — ₹${cycleData?.priceInRupees.toLocaleString('en-IN') || ''}`}
            </button>
          </>
        )}
      </motion.div>

      <Footer />
    </div>
  )
}

export default PlanCheckout
