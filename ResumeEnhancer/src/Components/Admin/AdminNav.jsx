import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { FaChartPie, FaUsers, FaRupeeSign, FaClipboardList, FaCoins, FaBullhorn, FaSlidersH, FaSearch, FaSpinner, FaCommentDots, FaBug, FaUserTie } from 'react-icons/fa'
import { GlobalSearch } from '../../Services/operations/Admin'

// two entirely separate tab sets sir — Admin gets /Admin/*, Support gets its OWN /Support/*
// pages. Support never sees Audit Log, Settings, or Recruiter Applications (those backend
// routes are isAdmin-gated) — promoting someone to Recruiter is the same class of judgment
// call as any other role change, Admin-only, not just a hidden tab on a shared page.
const adminTabs = [
  { name: 'Overview', path: '/Admin', icon: <FaChartPie /> },
  { name: 'Users', path: '/Admin/Users', icon: <FaUsers /> },
  { name: 'Payments', path: '/Admin/Payments', icon: <FaRupeeSign /> },
  { name: 'Audit Log', path: '/Admin/Audit', icon: <FaClipboardList /> },
  { name: 'Credit Grants', path: '/Admin/Credit-Grants', icon: <FaCoins /> },
  { name: 'Announcements', path: '/Admin/Announcements', icon: <FaBullhorn /> },
  { name: 'Testimonials', path: '/Admin/Testimonials', icon: <FaCommentDots /> },
  { name: 'Reports', path: '/Admin/Reports', icon: <FaBug /> },
  { name: 'Recruiter Applications', path: '/Admin/Recruiter-Applications', icon: <FaUserTie /> },
  { name: 'Settings', path: '/Admin/Settings', icon: <FaSlidersH /> },
]

const supportTabs = [
  { name: 'Overview', path: '/Support', icon: <FaChartPie /> },
  { name: 'Users', path: '/Support/Users', icon: <FaUsers /> },
  { name: 'Payments', path: '/Support/Payments', icon: <FaRupeeSign /> },
  { name: 'Announcements', path: '/Support/Announcements', icon: <FaBullhorn /> },
  { name: 'Testimonials', path: '/Support/Testimonials', icon: <FaCommentDots /> },
  { name: 'Reports', path: '/Support/Reports', icon: <FaBug /> },
]

// one bar to find a user or a payment sir, instead of hunting through each page's own
// filter. Scoped to Users + Payments only — chats/reviews have no standalone admin page
// to deep-link into, just the summary already inside the user detail drawer
const GlobalAdminSearch = () => {
  const navigate = useNavigate()
  const { token, user: me } = useSelector((state) => state.auth)
  const boxRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  // below 2 chars sir, this effect does nothing at all — results/loading are only ever
  // rendered once showDropdown requires that same 2-char minimum, so stale state from a
  // shorter query never has a chance to leak into the UI
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return

    // must flip synchronously sir — the spinner needs to show immediately on keystroke,
    // not only once the 300ms debounce timer below actually fires
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await GlobalSearch(trimmed, token)
        setResults(data)
      } catch {
        setResults({ users: [], payments: [] })
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, token])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    const handleEscape = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const base = me?.role === 'Admin' ? '/Admin' : '/Support'

  const goToUser = (userId) => {
    setOpen(false)
    setQuery('')
    navigate(`${base}/Users?highlight=${userId}`)
  }

  const goToPayments = () => {
    setOpen(false)
    setQuery('')
    navigate(`${base}/Payments`)
  }

  const showDropdown = open && query.trim().length >= 2
  const hasResults = results && (results.users.length > 0 || results.payments.length > 0)

  return (
    <div ref={boxRef} className="relative w-full max-w-xs my-2">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-400 text-xs" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search users or payments..."
          aria-label="Search users or payments"
          className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-8 pr-8 py-1.5 text-xs text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
        />
        {loading && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-richblack-400 text-xs animate-spin" />}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-80 max-w-[90vw] rounded-xl bg-richblack-800 border border-richblack-600 shadow-2xl shadow-richblack-900/50 overflow-hidden"
          >
            {!results || (!hasResults && !loading) ? (
              <p className="text-xs text-richblack-400 px-4 py-4 text-center">
                {loading ? 'Searching...' : 'No matches.'}
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {results.users.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-richblack-400">Users</p>
                    {results.users.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => goToUser(u._id)}
                        className="w-full text-left px-4 py-2 hover:bg-richblack-700 transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-richblack-5 truncate">{u.firstName} {u.lastName}</span>
                          <span className="block text-[11px] text-richblack-400 truncate">{u.email}</span>
                        </span>
                        {u.isBanned && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-pink-700/30 text-pink-100 border border-pink-700">BANNED</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {results.payments.length > 0 && (
                  <div className="py-2 border-t border-richblack-700">
                    <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-richblack-400">Payments</p>
                    {results.payments.map((p) => (
                      <button
                        key={p._id}
                        onClick={goToPayments}
                        title="Open the Payments page — filter by status there to narrow it down"
                        className="w-full text-left px-4 py-2 hover:bg-richblack-700 transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-richblack-5 truncate">{p.user?.email || 'deleted user'}</span>
                          <span className="block text-[11px] text-richblack-400 truncate font-mono">{p.orderId}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-richblack-300">₹{(p.amount / 100).toLocaleString('en-IN')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// the section switcher sir — sits under the navbar on every admin/support page. Which tab
// set renders is driven entirely by the logged-in user's role, not by which URL they're on,
// so an Admin who somehow lands on a /Support/* page (they shouldn't, SupportRoute blocks it)
// still sees their own real nav rather than a stale one
const AdminNav = () => {
  const location = useLocation()
  const { user } = useSelector((state) => state.auth)
  const tabs = user?.role === 'Admin' ? adminTabs : supportTabs

  return (
    <div className="border-b border-richblack-700 bg-richblack-900">
      <div className="w-full px-6 flex flex-wrap items-center justify-between gap-x-4">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                  active ? 'text-yellow-50' : 'text-richblack-300 hover:text-richblack-5'
                }`}
              >
                {tab.icon} {tab.name}
                {active && (
                  <motion.span
                    layoutId="admin-nav-underline"
                    className="absolute left-0 right-0 -bottom-px h-0.5 bg-yellow-50"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
        <GlobalAdminSearch />
      </div>
    </div>
  )
}

export default AdminNav
