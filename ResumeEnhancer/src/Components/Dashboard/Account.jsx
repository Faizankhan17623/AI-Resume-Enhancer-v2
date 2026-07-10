import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaUser, FaCrown, FaFileAlt, FaComments, FaSignOutAlt } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { GetProfile } from '../../Services/operations/User'
import { GetPaymentHistory } from '../../Services/operations/Payment'
import { LogoutUser } from '../../Services/operations/Auth'

const statusChip = {
  paid: 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700',
  created: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  failed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

const Account = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { profile, loading } = useSelector((state) => state.profile)
  const { history } = useSelector((state) => state.payment)

  useEffect(() => {
    dispatch(GetProfile(token))
    dispatch(GetPaymentHistory(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !profile) {
    return (
      <DashboardLayout title="My account">
        <Loading text="Loading your account..." />
      </DashboardLayout>
    )
  }

  const { user, plan, activity } = profile
  // credits bar sir — null limit means unlimited
  const creditsPercent = plan.creditsLimit ? Math.min(100, (plan.creditsUsed / plan.creditsLimit) * 100) : 0

  return (
    <DashboardLayout title="My account">
      <Helmet>
        <title>My Account | ResumeEnhancer</title>
      </Helmet>

      <div className="h-full overflow-y-auto max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-5 animate-fadeIn">

        {/* Profile card sir */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-50 flex items-center justify-center shrink-0">
            <FaUser className="text-2xl text-richblack-900" />
          </div>
          <div className="flex-1">
            <p className="font-display text-xl text-richblack-5">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-richblack-300 mt-0.5">{user.email}</p>
            <p className="text-sm text-richblack-400 mt-0.5">{user.CountryCode} {user.number}</p>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <span className="text-xs text-richblack-400">Member since {new Date(user.createdAt).toDateString()}</span>
            <button
              onClick={() => dispatch(LogoutUser(navigate))}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-pink-100 border border-pink-700 rounded-full hover:bg-pink-700/20 transition-all duration-200 cursor-pointer"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>

        {/* Plan + usage row sir */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Plan card */}
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-richblack-5">Your Plan</h2>
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-yellow-900/15 text-yellow-100">
                <FaCrown /> {plan.name}
              </span>
            </div>

            {/* credits bar sir */}
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-richblack-200">AI credits used</span>
              <span className="text-richblack-5 font-mono font-bold">
                {plan.creditsUsed}{plan.creditsLimit ? ` / ${plan.creditsLimit}` : ' (unlimited)'}
              </span>
            </div>
            {plan.creditsLimit && (
              <div className="w-full h-2.5 rounded-full bg-richblack-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${creditsPercent >= 90 ? 'bg-pink-200' : creditsPercent >= 60 ? 'bg-yellow-50' : 'bg-caribgreen-100'}`}
                  style={{ width: `${creditsPercent}%` }}
                />
              </div>
            )}

            {plan.expiresAt && (
              <p className="mt-4 text-xs text-richblack-300">
                Valid until <span className="text-richblack-5 font-medium">{new Date(plan.expiresAt).toDateString()}</span>
              </p>
            )}

            {plan.key !== 'ProMax' && (
              <Link to="/Pricing" className="inline-block mt-5">
                <IconBtn text="Upgrade plan" customClasses="text-sm" />
              </Link>
            )}
          </div>

          {/* Activity card */}
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <h2 className="font-display text-lg text-richblack-5 mb-5">Your Activity</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/Dashboard/History" className="rounded-lg bg-yellow-900/5 shadow-sm shadow-richblack-900/10 p-4 hover:shadow-md transition-all duration-200">
                <FaFileAlt className="text-blue-100 mb-2" />
                <p className="font-display text-2xl text-richblack-5">{activity.reviewCount}</p>
                <p className="text-xs text-richblack-300 mt-0.5">ATS Reviews</p>
              </Link>
              <Link to="/Dashboard/Chats" className="rounded-lg bg-yellow-900/5 shadow-sm shadow-richblack-900/10 p-4 hover:shadow-md transition-all duration-200">
                <FaComments className="text-caribgreen-100 mb-2" />
                <p className="font-display text-2xl text-richblack-5">{activity.chatCount}</p>
                <p className="text-xs text-richblack-300 mt-0.5">Coach Chats</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Payment history sir */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-4">Payment History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-richblack-300 py-4 text-center">No payments yet — you are on the free plan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-richblack-400 border-b border-richblack-700">
                    <th className="pb-3 pr-4">Plan</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Order ID</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-richblack-700">
                  {history.map((payment) => (
                    <tr key={payment._id} className="text-richblack-100">
                      <td className="py-3 pr-4 font-medium text-richblack-5">{payment.plan}</td>
                      <td className="py-3 pr-4 font-mono">₹{payment.amount / 100}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusChip[payment.status] || statusChip.created}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-richblack-300">{payment.orderId}</td>
                      <td className="py-3 text-xs text-richblack-300">{new Date(payment.createdAt).toDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Account
