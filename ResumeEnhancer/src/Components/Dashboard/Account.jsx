import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import Swal from 'sweetalert2'
import { FaUser, FaCrown, FaFileAlt, FaComments, FaSignOutAlt, FaBell, FaLock, FaShieldAlt, FaTrash } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { GetProfile, UpdateNotificationPrefs, ChangePassword } from '../../Services/operations/User'
import { GetPaymentHistory } from '../../Services/operations/Payment'
import { LogoutUser, DeleteAccount } from '../../Services/operations/Auth'

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

// Support/Admin only sir — a normal User has nothing here worth showing, the badge would
// just be noise ("User" on every single account)
const roleBadge = {
  Admin: 'bg-pink-700/30 text-pink-100 border-pink-700',
  Support: 'bg-blue-700/30 text-blue-25 border-blue-700',
}

const passwordInputClass = "w-full rounded-xl bg-richblack-900 border border-richblack-600 px-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const passwordLabelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
const passwordErrorClass = "mt-1 text-xs text-pink-200"

// small on/off switch sir — used only for the notification preferences below
const Toggle = ({ checked, onChange, label, hint }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-medium text-richblack-5">{label}</p>
      {hint && <p className="text-xs text-richblack-400 mt-0.5">{hint}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 cursor-pointer ${checked ? 'bg-yellow-50' : 'bg-richblack-600'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-richblack-900"
        style={{ x: checked ? 20 : 0 }}
      />
    </button>
  </div>
)

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
  const [changingPassword, setChangingPassword] = useState(false)
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, watch: watchPassword, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm()

  useEffect(() => {
    dispatch(GetProfile(token))
    dispatch(GetPaymentHistory(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChangePassword = async (data) => {
    setChangingPassword(true)
    await dispatch(ChangePassword(data.oldPassword, data.newPassword, data.confirmNewPassword, token, () => resetPasswordForm()))
    setChangingPassword(false)
  }

  const handleDeleteAccount = () => {
    Swal.fire({
      ...swalDark,
      title: 'Delete your account?',
      text: 'Your account will be suspended immediately and permanently deleted in 2 days. Log back in before then to undo this.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete my account',
      confirmButtonColor: '#C1443C',
    }).then((result) => {
      if (result.isConfirmed) dispatch(DeleteAccount(token, navigate))
    })
  }

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
        <title>My Account | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-5">

        {/* Profile card sir */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-50 flex items-center justify-center shrink-0">
            <FaUser className="text-2xl text-richblack-900" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-xl text-richblack-5">{user.firstName} {user.lastName}</p>
              {/* Support/Admin only sir — a plain User sees nothing here, per Faizan's request */}
              {roleBadge[user.role] && (
                <span className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${roleBadge[user.role]}`}>
                  <FaShieldAlt /> {user.role}
                </span>
              )}
            </div>
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

        {/* Notification preferences sir — per-type opt-out, all on by default */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
            <FaBell className="text-yellow-50 text-base" /> Email Notifications
          </h2>
          <p className="text-xs text-richblack-400 mb-2">Choose which emails you'd like to receive from us.</p>
          <div className="divide-y divide-richblack-700">
            <Toggle
              label="Streak reminders"
              hint="A nudge when your activity streak is about to break"
              checked={user.notifyStreak !== false}
              onChange={(value) => dispatch(UpdateNotificationPrefs({ notifyStreak: value }, token))}
            />
            <Toggle
              label="Win-back emails"
              hint="A note if you haven't reviewed a resume in a couple weeks"
              checked={user.notifyWinBack !== false}
              onChange={(value) => dispatch(UpdateNotificationPrefs({ notifyWinBack: value }, token))}
            />
            <Toggle
              label="Weekly digest"
              hint="A weekly summary of your review activity and score progress"
              checked={user.notifyDigest !== false}
              onChange={(value) => dispatch(UpdateNotificationPrefs({ notifyDigest: value }, token))}
            />
            <Toggle
              label="Monthly resume health check"
              hint="A monthly ATS formatting score for your default resume"
              checked={user.notifyHealthCheck !== false}
              onChange={(value) => dispatch(UpdateNotificationPrefs({ notifyHealthCheck: value }, token))}
            />
          </div>
        </div>

        {/* Change password sir — a Google account has no local password to change */}
        {user.provider === 'local' && (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-1 flex items-center gap-2">
            <FaLock className="text-yellow-50 text-base" /> Change Password
          </h2>
          <p className="text-xs text-richblack-400 mb-4">Use a strong password you don't use anywhere else.</p>

          <form onSubmit={handlePasswordSubmit(onChangePassword)} className="max-w-md space-y-4">
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
        )}

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

        {/* Danger zone sir — suspends immediately, permanently deletes after a 2-day recovery window */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 border border-pink-700/40">
          <h2 className="font-display text-lg text-pink-100 mb-1 flex items-center gap-2">
            <FaTrash className="text-base" /> Delete Account
          </h2>
          <p className="text-xs text-richblack-400 mb-4">
            This suspends your account right away. It's permanently deleted after 2 days — log back in before then to recover it.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2.5 text-sm font-semibold text-pink-100 border border-pink-700 rounded-full hover:bg-pink-700/20 transition-all duration-200 cursor-pointer"
          >
            Delete my account
          </button>
        </div>
      </PageTransition>
    </DashboardLayout>
  )
}

export default Account
