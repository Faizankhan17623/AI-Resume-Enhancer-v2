import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaUserFriends, FaCopy } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import ReferralDashboardModal from '../Dashboard/ReferralDashboardModal'
import Loading from '../extra/Loading'
import { GetReferralStats } from '../../Services/operations/User'

// the Recruiter-side home for the referral card sir — previously wired to show for Recruiter
// accounts inside Account.jsx, but PrivateRoute redirects every Recruiter away from
// /Dashboard/Account before it ever mounts (see PrivateRoute.jsx), so that copy of the card was
// unreachable dead code. This is a real, reachable page instead: /Recruiter/Account, in the
// Recruiter's own layout and nav. No credit bonus for Recruiter referrals (see
// controllers/user.js's grantReferralBonus) — this page just lets them invite and track who
// they've brought in, same as the card's Recruiter copy always said.
const RecruiterAccount = () => {
  const { token } = useSelector((state) => state.auth)
  const [stats, setStats] = useState(null)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  useEffect(() => {
    GetReferralStats(token)().then(setStats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Account | Resumify Recruiter</title>
      </Helmet>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Account</h1>

      {!stats ? (
        <Loading text="Loading your referral link..." />
      ) : (
        <>
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 max-w-2xl">
            <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
              <FaUserFriends className="text-yellow-50 text-base" /> Invite Friends
            </h2>
            <p className="text-xs text-richblack-400 mb-4">
              Share your link to invite people to Resumify. Track everyone you've brought in on your referral dashboard.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-2.5">
              <p className="text-xs text-richblack-200 truncate flex-1">
                {`${window.location.origin}/Signup?ref=${stats.referralCode}`}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/Signup?ref=${stats.referralCode}`)
                  toast.success('Copied to clipboard')
                }}
                className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer shrink-0"
                title="Copy link"
              >
                <FaCopy className="text-sm" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-richblack-400">
                {stats.referralCount} referral{stats.referralCount === 1 ? '' : 's'} so far
              </p>
              <button
                onClick={() => setDashboardOpen(true)}
                className="text-xs font-semibold text-yellow-50 hover:underline cursor-pointer shrink-0"
              >
                View dashboard
              </button>
            </div>
          </div>
          <ReferralDashboardModal open={dashboardOpen} onClose={() => setDashboardOpen(false)} token={token} />
        </>
      )}
    </RecruiterLayout>
  )
}

export default RecruiterAccount
