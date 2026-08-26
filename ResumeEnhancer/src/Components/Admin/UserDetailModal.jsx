import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import Swal from 'sweetalert2'
import { FaTimes } from 'react-icons/fa'
import { modalBackdrop } from '../../utils/motion'
import { GetUserDetail, RejectSupportAppeal } from '../../Services/operations/Admin'
import { getProviderMeta } from '../../utils/authProvider'

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

// lightweight read-only drawer sir — surfaces the /admin/users/:userId endpoint that already
// existed on the backend (profile + review/chat counts + recent reviews/payments) but had
// no frontend consumer at all before this. page/search/roleFilter are passed through from
// Users.jsx sir — only needed now to refetch the list correctly after RejectSupportAppeal below
const UserDetailModal = ({ userId, onClose, page, search, roleFilter }) => {
  const dispatch = useDispatch()
  const { token, user: me } = useSelector((state) => state.auth)
  const { userDetail, userDetailLoading } = useSelector((state) => state.admin)
  const isAdmin = me?.role === 'Admin'

  useEffect(() => {
    if (userId) dispatch(GetUserDetail(userId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const user = userDetail?.user
  const activity = userDetail?.activity

  const handleRejectAppeal = async () => {
    const { isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Reject ${user.email}'s appeal?`,
      text: 'The account stays suspended. This was their one and only appeal for this suspension — they will be emailed that the decision is final.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject the appeal',
      confirmButtonColor: '#C1443C',
    })
    if (isConfirmed) {
      await dispatch(RejectSupportAppeal(user._id, token, page, search, roleFilter))
      dispatch(GetUserDetail(userId, token))
    }
  }

  return (
    <AnimatePresence>
      {userId && (
        <>
          <motion.div
            initial="hidden"
            animate="show"
            exit="exit"
            variants={modalBackdrop}
            className="fixed inset-0 z-[60] bg-richblack-900/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-detail-title"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[61] inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[92%] max-w-lg max-h-[85vh] overflow-y-auto thin-scrollbar rounded-2xl bg-richblack-800 border border-richblack-700 p-6 shadow-2xl shadow-richblack-900/50"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
            >
              <FaTimes className="text-sm" />
            </button>

            {userDetailLoading || !user ? (
              <p className="text-sm text-richblack-300 py-10 text-center">Loading user detail...</p>
            ) : (
              <>
                <h3 id="user-detail-title" className="font-display font-bold text-lg text-richblack-5 mb-1">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-richblack-300 mb-4">{user.email}</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-lg bg-richblack-900/60 border border-richblack-700 px-3 py-2">
                    <p className="text-[10px] text-richblack-400 mb-1">Role</p>
                    <p className="text-sm text-richblack-5 font-medium">{user.role}</p>
                  </div>
                  <div className="rounded-lg bg-richblack-900/60 border border-richblack-700 px-3 py-2">
                    <p className="text-[10px] text-richblack-400 mb-1">Plan</p>
                    <p className="text-sm text-richblack-5 font-medium">{user.SubType === 'ProMax' ? 'Pro Max' : (user.SubType || 'Basic')}</p>
                  </div>
                  <div className="rounded-lg bg-richblack-900/60 border border-richblack-700 px-3 py-2">
                    <p className="text-[10px] text-richblack-400 mb-1">Sign-up method</p>
                    {(() => {
                      const { label, icon: Icon } = getProviderMeta(user.provider)
                      return (
                        <p className="text-sm text-richblack-5 font-medium flex items-center gap-1.5">
                          <Icon className="text-xs text-richblack-400" /> {label}
                        </p>
                      )
                    })()}
                  </div>
                  <div className="rounded-lg bg-richblack-900/60 border border-richblack-700 px-3 py-2">
                    <p className="text-[10px] text-richblack-400 mb-1">Credits used</p>
                    <p className="text-sm text-richblack-5 font-medium font-mono">{user.count}</p>
                  </div>
                  <div className="rounded-lg bg-richblack-900/60 border border-richblack-700 px-3 py-2 col-span-2">
                    <p className="text-[10px] text-richblack-400 mb-1">Status</p>
                    <p className="text-sm text-richblack-5 font-medium">
                      {user.isBanned
                        ? `${user.permanentlySuspended ? 'Permanently banned' : 'Banned'}${user.banReason ? ` — ${user.banReason}` : ''}`
                        : (user.Verified ? 'Active' : 'Unverified')}
                    </p>
                  </div>
                  {user.isBanned && user.suspensionAppeal?.message && (
                    <div className="rounded-lg bg-yellow-700/10 border border-yellow-700 px-3 py-2 col-span-2">
                      <p className="text-[10px] text-yellow-25 mb-1 font-semibold">
                        {user.suspensionAppeal.status === 'pending' ? "User's appeal (pending review)" : "User's appeal"}
                      </p>
                      <p className="text-sm text-richblack-5">{user.suspensionAppeal.message}</p>
                      {/* Support's one-shot appeal sir — Admin-only, and only while there's
                          actually a pending appeal to close out. Restoring the account
                          (banUser, banned:false) is still the "accept" path; this is the
                          explicit "reviewed and rejected, stays suspended" action that was
                          missing entirely before — an Admin previously had no way to mark an
                          appeal reviewed without also un-banning the account. */}
                      {isAdmin && user.role === 'Support' && user.suspensionAppeal.status === 'pending' && (
                        <button
                          onClick={handleRejectAppeal}
                          className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-700/20 text-pink-100 border border-pink-700 hover:bg-pink-700/30 transition-colors duration-200 cursor-pointer"
                        >
                          Reject appeal (final)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="text-center">
                    <p className="font-display text-xl text-richblack-5">{activity?.reviewCount ?? 0}</p>
                    <p className="text-xs text-richblack-400">total reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl text-richblack-5">{activity?.chatCount ?? 0}</p>
                    <p className="text-xs text-richblack-400">total chats</p>
                  </div>
                </div>

                {activity?.recentReviews?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs text-richblack-400 mb-2 font-semibold">Recent reviews</p>
                    <div className="space-y-1.5">
                      {activity.recentReviews.map((r) => (
                        <div key={r._id} className="flex items-center justify-between text-xs">
                          <span className="text-richblack-100 truncate flex-1 mr-2">{r.jdTitle || 'Untitled'} · {r.plan}</span>
                          <span className="text-richblack-400 shrink-0">{r.atsScore}/100 · {new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activity?.recentPayments?.length > 0 && (
                  <div>
                    <p className="text-xs text-richblack-400 mb-2 font-semibold">Recent payments</p>
                    <div className="space-y-1.5">
                      {activity.recentPayments.map((p) => (
                        <div key={p._id} className="flex items-center justify-between text-xs">
                          <span className="text-richblack-100">{p.plan} · ₹{p.amount / 100} · {p.status}</span>
                          <span className="text-richblack-400 shrink-0">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default UserDetailModal
