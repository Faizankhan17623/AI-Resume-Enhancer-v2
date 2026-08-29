import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import { FaBell, FaLock, FaTrash, FaEdit, FaDownload, FaUserFriends, FaCopy, FaSignOutAlt, FaCrown } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import ShareTestimonialCard from '../Dashboard/ShareTestimonialCard'
import ReferralDashboardModal from '../Dashboard/ReferralDashboardModal'
import { Toggle, EditableField } from '../Dashboard/Account'
import { swalDark, passwordInputClass, passwordLabelClass, passwordErrorClass } from '../../utils/accountShared'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import { GetProfile, UpdateNotificationPrefs, ChangePassword, UpdateFirstName, UpdateLastName, UpdateEmail, UpdateNumber, ExportMyData, GetReferralStats } from '../../Services/operations/User'
import { LogoutUser, DeleteAccount } from '../../Services/operations/Auth'
import { getInitial, getAvatarColor } from '../../utils/avatar'

// one usage meter row sir — "X of Y used this month", null limit renders as "Unlimited"
const UsageBar = ({ label, used, limit }) => {
  const percent = limit ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-richblack-200">{label}</span>
        <span className="text-richblack-5 font-mono">{used}{limit !== null ? ` / ${limit}` : ' (unlimited)'}</span>
      </div>
      {limit !== null && (
        <div className="w-full h-1.5 rounded-full bg-richblack-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${percent >= 90 ? 'bg-pink-200' : percent >= 60 ? 'bg-yellow-50' : 'bg-caribgreen-100'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}

// same invite-a-friend card layout as the User Account page's ReferralCard sir, just the
// Recruiter-flavored copy this page already used before this rebuild (no credit bonus for
// Recruiter referrals — see controllers/user.js's grantReferralBonus)
const ReferralCard = ({ token }) => {
  const [stats, setStats] = useState(null)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  useEffect(() => {
    GetReferralStats(token)().then(setStats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!stats) return null

  const referralUrl = `${window.location.origin}/Signup?ref=${stats.referralCode}`

  return (
    <>
      <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
        <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
          <FaUserFriends className="text-yellow-50 text-base" /> Invite Friends
        </h2>
        <p className="text-xs text-richblack-400 mb-4">
          Share your link to invite people to Resumify. Track everyone you've brought in on your referral dashboard.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-2.5">
          <p className="text-xs text-richblack-200 truncate flex-1">{referralUrl}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(referralUrl)
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
  )
}

// the Recruiter equivalent of Dashboard/Account.jsx sir, brought up to the same set of features
// per direct request — profile header, email notifications (Recruiter-relevant toggle only),
// invite friends, share your story, edit profile, change password, export my data, delete
// account. Deliberately skips the Plan/Credits and Payment History cards the User page has —
// Recruiters have no AI-credit/subscription concept, so there's nothing meaningful to show there.
const RecruiterAccount = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token, user: authUser } = useSelector((state) => state.auth)
  const { profile, loading } = useSelector((state) => state.profile)
  const [changingPassword, setChangingPassword] = useState(false)
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, watch: watchPassword, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm()

  // same shared full-screen loader pattern as Dashboard/Account.jsx sir
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('Saving...')

  const withBusyLabel = (label, onLoadingChange) => (next) => {
    if (next) setBusyLabel(label)
    onLoadingChange(next)
  }

  useEffect(() => {
    dispatch(GetProfile(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChangePassword = async (data) => {
    setChangingPassword(true)
    await dispatch(ChangePassword(data.oldPassword, data.newPassword, data.confirmNewPassword, token, () => resetPasswordForm(), withBusyLabel('Updating your password...', setBusy)))
    setChangingPassword(false)
  }

  const handleDeleteAccount = () => {
    Swal.fire({
      ...swalDark,
      title: 'Delete your account?',
      html: 'Your account will be suspended immediately and permanently deleted in 2 days. Log back in before then to undo this.<br/><br/>Type <b>delete my account</b> below to confirm.',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'delete my account',
      customClass: { input: 'swal-dark-select' },
      inputValidator: (value) => {
        if ((value || '').trim().toLowerCase() !== 'delete my account') {
          return 'Please type "delete my account" exactly to confirm'
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Delete my account',
      confirmButtonColor: '#C1443C',
    }).then((result) => {
      if (result.isConfirmed) dispatch(DeleteAccount(token, navigate))
    })
  }

  if (loading || !profile) {
    return (
      <RecruiterLayout>
        <Loading text="Loading your account..." />
      </RecruiterLayout>
    )
  }

  const { user, recruiterPlan } = profile

  // sends the recruiter to the review/checkout page instead of buying inline sir — same
  // "pick a plan here, review + pay there" split as the User side's Pricing.jsx → PlanCheckout.jsx
  const handleBuyPlan = (planKey) => {
    navigate(`/Recruiter/Checkout/${planKey}`)
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Account | Resumify Recruiter</title>
      </Helmet>

      <AnimatePresence>
      {busy && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text={busyLabel} size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-5">

        {/* Profile card sir */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div
            style={{ backgroundColor: getAvatarColor(user) }}
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-2xl font-semibold text-white"
          >
            {getInitial(user)}
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

        {/* Your Plan sir — usage meters for every metered limit, Claude-Code-style "X of Y used
            this month" per direct request. Completely separate plan/payment system from the
            User Account page's plan card — see utils/RecruiterPlans.js. */}
        {recruiterPlan && (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-richblack-5">Your Plan</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/Recruiter/Pricing')}
                  className="text-xs font-semibold text-richblack-300 hover:text-richblack-5 underline decoration-richblack-600 transition-colors duration-200 cursor-pointer"
                >
                  Compare plans
                </button>
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-yellow-900/15 text-yellow-100">
                  <FaCrown /> {recruiterPlan.name}
                </span>
              </div>
            </div>

            <UsageBar label="Active job postings" used={recruiterPlan.usage.jobPostings.used} limit={recruiterPlan.usage.jobPostings.limit} />
            <UsageBar label="AI-scored applicants" used={recruiterPlan.usage.aiScores.used} limit={recruiterPlan.usage.aiScores.limit} />
            <UsageBar label="AI job-description drafts" used={recruiterPlan.usage.jdWrites.used} limit={recruiterPlan.usage.jdWrites.limit} />
            <UsageBar label="AI interview-question generations" used={recruiterPlan.usage.interviewQGen.used} limit={recruiterPlan.usage.interviewQGen.limit} />
            <UsageBar label="AI candidate summaries" used={recruiterPlan.usage.summaries.used} limit={recruiterPlan.usage.summaries.limit} />

            {recruiterPlan.expiresAt && (
              <p className="mt-4 text-xs text-richblack-300">
                Valid until <span className="text-richblack-5 font-medium">
                  {new Date(recruiterPlan.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
            )}

            {recruiterPlan.key !== 'ProMax' && (
              <div className="mt-5 flex flex-wrap gap-3">
                {recruiterPlan.key === 'Basic' && (
                  <IconBtn
                    text="Upgrade to Pro"
                    onclick={() => handleBuyPlan('Pro')}
                    customClasses="text-sm"
                  />
                )}
                <IconBtn
                  text="Upgrade to Pro Max"
                  onclick={() => handleBuyPlan('ProMax')}
                  customClasses="text-sm"
                  outline={recruiterPlan.key === 'Basic'}
                />
              </div>
            )}
          </div>
        )}

        {/* Email notifications sir — Recruiter-relevant toggle only. notifyStreak/notifyWinBack/
            notifyDigest/notifyHealthCheck/notifyInterviewPrep are candidate/resume-review
            concepts and don't apply here. */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
            <FaBell className="text-yellow-50 text-base" /> Email Notifications
          </h2>
          <p className="text-xs text-richblack-400 mb-2">Choose which emails you'd like to receive from us.</p>
          <div className="divide-y divide-richblack-700">
            <Toggle
              label="New applicant alerts"
              hint="An email the moment a candidate applies to one of your job postings"
              checked={user.notifyNewApplicant !== false}
              onChange={(value) => dispatch(UpdateNotificationPrefs({ notifyNewApplicant: value }, token, withBusyLabel('Saving...', setBusy)))}
            />
          </div>
        </div>

        {/* Invite friends sir */}
        <ReferralCard token={token} />

        {/* Share a homepage testimonial sir */}
        <ShareTestimonialCard />

        {/* Edit profile sir — inline-editable name/email/phone */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
            <FaEdit className="text-yellow-50 text-base" /> Edit Profile
          </h2>
          <p className="text-xs text-richblack-400 mb-2">Click the pencil next to a field to update it.</p>
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div className="divide-y divide-richblack-700">
              <EditableField
                label="First name"
                value={user.firstName}
                onSave={(v) => dispatch(UpdateFirstName(v, token, withBusyLabel('Saving...', setBusy)))}
              />
              <EditableField
                label="Last name"
                value={user.lastName}
                onSave={(v) => dispatch(UpdateLastName(v, token, withBusyLabel('Saving...', setBusy)))}
              />
            </div>
            <div className="divide-y divide-richblack-700">
              <EditableField
                label="Email"
                value={user.email}
                type="email"
                onSave={(v) => dispatch(UpdateEmail(v, token, withBusyLabel('Saving...', setBusy)))}
              />
              <EditableField
                label="Phone number"
                value={user.number}
                type="tel"
                onSave={(v) => dispatch(UpdateNumber(v, token, withBusyLabel('Saving...', setBusy)))}
              />
            </div>
          </div>
        </div>

        {/* Change password sir — same OAuth-provider hint as Dashboard/Account.jsx */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
            <FaLock className="text-yellow-50 text-base" /> Change Password
          </h2>
          <p className="text-xs text-richblack-400 mb-4">Use a strong password you don't use anywhere else.</p>
          {user.provider !== 'local' && (
            <p className="text-xs text-yellow-50 mb-4">
              You signed up with {user.provider.charAt(0).toUpperCase() + user.provider.slice(1)} — your current password is <span className="font-mono">Oauth123</span>. Set a new one below to also enable email/password sign-in.
            </p>
          )}

          <form onSubmit={handlePasswordSubmit(onChangePassword)} className="max-w-md mx-auto space-y-4">
            <div>
              <label className={passwordLabelClass}>Current Password</label>
              <PasswordInput
                inputClass={passwordInputClass}
                register={registerPassword}
                name="oldPassword"
                validation={{ required: "Current password is required" }}
              />
              {passwordErrors.oldPassword && <p className={passwordErrorClass}>{passwordErrors.oldPassword.message}</p>}
            </div>

            <div>
              <label className={passwordLabelClass}>New Password</label>
              <PasswordInput
                inputClass={passwordInputClass}
                register={registerPassword}
                name="newPassword"
                validation={{
                  required: "New password is required",
                  minLength: { value: 8, message: "Minimum 8 characters" },
                  validate: (value) => value !== watchPassword("oldPassword") || "New password cannot be the same as your current password"
                }}
              />
              {passwordErrors.newPassword && <p className={passwordErrorClass}>{passwordErrors.newPassword.message}</p>}
            </div>

            <div>
              <label className={passwordLabelClass}>Confirm New Password</label>
              <PasswordInput
                inputClass={passwordInputClass}
                register={registerPassword}
                name="confirmNewPassword"
                validation={{
                  required: "Please confirm the new password",
                  validate: (value) => value === watchPassword("newPassword") || "Passwords do not match"
                }}
              />
              {passwordErrors.confirmNewPassword && <p className={passwordErrorClass}>{passwordErrors.confirmNewPassword.message}</p>}
            </div>

            <IconBtn
              type="submit"
              text={changingPassword ? "Updating..." : "Update password"}
              disabled={changingPassword}
              customClasses="text-sm"
            />
          </form>
        </div>

        {/* Export my data sir */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
              <FaDownload className="text-yellow-50 text-base" /> Export My Data
            </h2>
            <p className="text-xs text-richblack-400">
              Download a copy of your posted jobs, received applications, and payment history as a JSON file.
            </p>
          </div>
          <button
            onClick={() => dispatch(ExportMyData(token, withBusyLabel('Preparing your data export...', setBusy)))}
            className="shrink-0 px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
          >
            Download my data
          </button>
        </div>

        {/* Danger zone sir — suspends immediately, permanently deletes after a 2-day recovery window */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 border border-pink-700/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg text-pink-100 mb-1 flex items-center gap-2">
              <FaTrash className="text-base" /> Delete Account
            </h2>
            <p className="text-xs text-richblack-400">
              This suspends your account right away. It's permanently deleted after 2 days — log back in before then to recover it.
            </p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="shrink-0 px-4 py-2.5 text-sm font-semibold text-pink-100 border border-pink-700 rounded-full hover:bg-pink-700/20 transition-all duration-200 cursor-pointer"
          >
            Delete my account
          </button>
        </div>
      </div>
    </RecruiterLayout>
  )
}

export default RecruiterAccount
