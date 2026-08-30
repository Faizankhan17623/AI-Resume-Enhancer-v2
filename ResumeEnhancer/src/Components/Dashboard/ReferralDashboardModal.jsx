import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FaTimes, FaUserFriends } from 'react-icons/fa'
import { modalBackdrop, modalPanel } from '../../utils/motion'
import { GetReferralHistory } from '../../Services/operations/User'
import Loading from '../extra/Loading'

// one totals tile sir — same 4-up grid shape used across the admin dashboard's stat cards
const StatTile = ({ label, invites, credits }) => (
  <div className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-3">
    <p className="text-xs text-richblack-400">{label}</p>
    <p className="font-display text-xl text-richblack-5 mt-1">{invites}</p>
    <p className="text-xs text-richblack-400 mt-0.5">invite{invites === 1 ? '' : 's'} · {credits} credit{credits === 1 ? '' : 's'}</p>
  </div>
)

// the Account page's referral dashboard sir — who was invited, when, how much, plus
// week/month/year/all-time totals and an optional custom date range. Opened from ReferralCard.
const ReferralDashboardModal = ({ open, onClose, token }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const load = async (from, to) => {
    setLoading(true)
    const result = await GetReferralHistory(token, from, to)()
    setData(result)
    setLoading(false)
  }

  // inlined rather than calling load() sir — load is an async function, and its first synchronous
  // statement (setLoading(true), before any await) got flagged as a setState-in-effect violation
  // when called from here. A plain .then() chain with no async-function boundary avoids the
  // indirection, same shape as SharedPortfolio.jsx's mount fetch. The setLoading(true) reset
  // itself is still synchronous and still needed — it's what shows the spinner the instant the
  // modal opens, same deliberate-reset-before-async-op reasoning as TestConsent.jsx's camera/speed
  // effects, so it's scoped-disabled rather than removed. load() itself is kept as-is below for
  // handleApplyCustomRange's click-handler use, where the rule doesn't apply.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    GetReferralHistory(token)().then((result) => {
      if (cancelled) return
      setData(result)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleApplyCustomRange = () => {
    if (!customFrom && !customTo) return
    load(customFrom || undefined, customTo || undefined)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-richblack-900/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div variants={modalPanel} className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-richblack-800 border border-richblack-600 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="w-5" />
              <h3 className="flex-1 text-center font-display font-bold text-lg text-richblack-5 flex items-center justify-center gap-2">
                <FaUserFriends className="text-yellow-50 text-base" /> Referral Dashboard
              </h3>
              <button onClick={onClose} className="text-richblack-400 hover:text-richblack-5 cursor-pointer">
                <FaTimes />
              </button>
            </div>

            {loading || !data ? (
              <Loading text="Loading your referral history..." size="compact" />
            ) : (
              <>
                {/* totals sir — week/month/year/all-time, always shown; custom slots in as a 5th
                    tile only once a range has actually been applied */}
                <div className={`grid gap-3 mt-5 ${data.totals.custom ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  <StatTile label="This Week" invites={data.totals.week.invites} credits={data.totals.week.credits} />
                  <StatTile label="This Month" invites={data.totals.month.invites} credits={data.totals.month.credits} />
                  <StatTile label="This Year" invites={data.totals.year.invites} credits={data.totals.year.credits} />
                  <StatTile label="All Time" invites={data.totals.allTime.invites} credits={data.totals.allTime.credits} />
                  {data.totals.custom && (
                    <StatTile label="Custom Range" invites={data.totals.custom.invites} credits={data.totals.custom.credits} />
                  )}
                </div>

                {/* custom range picker sir */}
                <div className="flex flex-wrap items-end gap-3 mt-5 p-4 rounded-lg bg-richblack-900/40 border border-richblack-700">
                  <div>
                    <label className="text-xs font-semibold text-richblack-300 mb-1 block">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-richblack-300 mb-1 block">To</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustomRange}
                    disabled={!customFrom && !customTo}
                    className="px-4 py-2 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:bg-yellow-25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>

                {/* the invite list sir — newest first */}
                <div className="mt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-richblack-300 mb-3">Everyone You've Invited</h4>
                  {data.entries.length === 0 ? (
                    <p className="text-sm text-richblack-400 text-center py-10">No referrals yet — share your link to get started.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.entries.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-richblack-900/50 border border-richblack-700 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm text-richblack-5 truncate">{entry.referredUserName}</p>
                            <p className="text-xs text-richblack-400 truncate">{entry.referredUserEmail}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-semibold ${entry.bonusCredits > 0 ? 'text-caribgreen-100' : 'text-richblack-400'}`}>
                              {entry.bonusCredits > 0 ? `+${entry.bonusCredits} credits` : 'No bonus'}
                            </p>
                            <p className="text-xs text-richblack-400 mt-0.5">{new Date(entry.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ReferralDashboardModal
