import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiMenu, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { FaChartPie, FaUsers, FaRupeeSign, FaClipboardList, FaCoins, FaBullhorn, FaSlidersH, FaSearch, FaSpinner, FaCommentDots, FaBug, FaUserTie, FaHeartbeat, FaHistory, FaSignOutAlt } from 'react-icons/fa'
import { GlobalSearch } from '../../Services/operations/Admin'
import { LogoutUser } from '../../Services/operations/Auth'
import { modalBackdrop } from '../../utils/motion'
import { getInitial, getAvatarColor } from '../../utils/avatar'

// same shell as Dashboard/DashboardLayout.jsx sir, per direct request — the Admin/Support area
// used to be a flat horizontal AdminNav.jsx tab bar that had grown to 13 tabs and started
// clipping (Testimonials/Reports/etc. running off-screen, the search box pushed past the visible
// edge). This replaces it with the same collapsible/resizable left sidebar the User dashboard
// already has, grouped into labeled sections so it stays scannable as more admin pages land.
//
// Two entirely separate tab sets sir — Admin gets /Admin/*, Support gets its OWN /Support/*
// pages. Support never sees Audit Log, Settings, or Recruiter Applications (those backend
// routes are isAdmin-gated) — promoting someone to Recruiter is the same class of judgment
// call as any other role change, Admin-only, not just a hidden tab on a shared page.
const adminSections = [
  {
    label: 'Overview',
    links: [{ name: 'Overview', path: '/Admin', icon: FaChartPie }],
  },
  {
    label: 'People & Money',
    links: [
      { name: 'Users', path: '/Admin/Users', icon: FaUsers },
      { name: 'Payments', path: '/Admin/Payments', icon: FaRupeeSign },
      { name: 'Credit Grants', path: '/Admin/Credit-Grants', icon: FaCoins },
    ],
  },
  {
    label: 'Content',
    links: [
      { name: 'Announcements', path: '/Admin/Announcements', icon: FaBullhorn },
      { name: 'Testimonials', path: '/Admin/Testimonials', icon: FaCommentDots },
      { name: 'Canned Responses', path: '/Admin/Canned-Responses', icon: FaCommentDots },
    ],
  },
  {
    label: 'Recruiter',
    links: [
      { name: 'Applications', path: '/Admin/Recruiter-Applications', icon: FaUserTie },
      { name: 'Data Health', path: '/Admin/Recruiter-Data-Health', icon: FaHeartbeat },
    ],
  },
  {
    label: 'System',
    links: [
      { name: 'Audit Log', path: '/Admin/Audit', icon: FaClipboardList },
      { name: 'My Activity', path: '/Admin/My-Activity', icon: FaHistory },
      { name: 'Reports', path: '/Admin/Reports', icon: FaBug },
      { name: 'Settings', path: '/Admin/Settings', icon: FaSlidersH },
    ],
  },
]

const supportSections = [
  {
    label: 'Overview',
    links: [{ name: 'Overview', path: '/Support', icon: FaChartPie }],
  },
  {
    label: 'People & Money',
    links: [
      { name: 'Users', path: '/Support/Users', icon: FaUsers },
      { name: 'Payments', path: '/Support/Payments', icon: FaRupeeSign },
    ],
  },
  {
    label: 'Content',
    links: [
      { name: 'Announcements', path: '/Support/Announcements', icon: FaBullhorn },
      { name: 'Testimonials', path: '/Support/Testimonials', icon: FaCommentDots },
      { name: 'Canned Responses', path: '/Support/Canned-Responses', icon: FaCommentDots },
    ],
  },
  {
    label: 'System',
    links: [
      { name: 'Reports', path: '/Support/Reports', icon: FaBug },
      { name: 'My Activity', path: '/Support/My-Activity', icon: FaHistory },
    ],
  },
]

// one bar to find a user or a payment sir, instead of hunting through each page's own filter.
// Scoped to Users + Payments only — chats/reviews have no standalone admin page to deep-link
// into, just the summary already inside the user detail drawer. Centered in the topbar now
// (per direct request) rather than pinned to the far right edge, since that edge is exactly
// where it used to get clipped once the old horizontal tab bar ran out of room.
const GlobalAdminSearch = () => {
  const navigate = useNavigate()
  const { token, user: me } = useSelector((state) => state.auth)
  const boxRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return

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
    <div ref={boxRef} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-richblack-400 text-sm" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search users or payments..."
          aria-label="Search users or payments"
          className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-10 pr-10 py-2.5 text-sm text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
        />
        {loading && <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-richblack-400 text-sm animate-spin" />}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full max-w-[90vw] rounded-xl bg-richblack-800 border border-richblack-600 shadow-2xl shadow-richblack-900/50 overflow-hidden"
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

const isActive = (link, pathname) => pathname === link.path

const SidebarContent = ({ pathname, user, sections, onNavigate, onLogout }) => (
  <>
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
      <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
      <span className="font-display font-bold text-base text-richblack-5 tracking-tight">
        Resum<span className="text-warm-200">ify</span>
      </span>
      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-pink-900/20 text-pink-100 border border-pink-800/40">
        {user?.role}
      </span>
    </Link>

    <div className="flex-1 min-h-0 overflow-y-auto hairline-scrollbar flex flex-col gap-4 pr-0.5">
      {sections.map((section) => (
        <nav key={section.label} className="flex flex-col gap-0.5">
          <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">{section.label}</span>
          {section.links.map((link) => {
            const Icon = link.icon
            const active = isActive(link, pathname)
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  active ? 'bg-yellow-900/15 text-yellow-50' : 'text-richblack-200 hover:bg-richblack-700/60 hover:text-richblack-5'
                }`}
              >
                <Icon className="text-[15px] shrink-0 opacity-90" /> {link.name}
              </Link>
            )
          })}
        </nav>
      ))}

      {/* the way back out sir — same role gate reasoning as the old AdminNav, just now a
          sidebar link instead of a separate top-level nav */}
      <nav className="flex flex-col gap-0.5">
        <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Account</span>
        <Link
          to="/Dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-richblack-200 hover:bg-richblack-700/60 hover:text-richblack-5 transition-colors duration-150"
        >
          <FaChartPie className="text-[15px] shrink-0 opacity-90" /> Back to Dashboard
        </Link>
      </nav>
    </div>

    <div className="mt-auto flex flex-col gap-2.5">
      <div className="flex items-center gap-1 rounded-xl hover:bg-richblack-700/60 transition-colors duration-150">
        <div className="flex items-center gap-2.5 px-2 py-2 flex-1 min-w-0">
          <div
            style={{ backgroundColor: getAvatarColor(user) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
          >
            {getInitial(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-richblack-5 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-richblack-300 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          className="self-stretch px-3 flex items-center justify-center text-richblack-500 hover:text-pink-200 hover:bg-pink-700/10 rounded-r-xl transition-colors duration-150 cursor-pointer shrink-0"
        >
          <FaSignOutAlt className="text-base" />
        </button>
      </div>
    </div>
  </>
)

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 380
const SIDEBAR_DEFAULT = 240
const SIDEBAR_STORAGE_KEY = 'resumify:adminSidebarWidth'
const SIDEBAR_COLLAPSED_KEY = 'resumify:adminSidebarCollapsed'

const AdminLayout = ({ title, children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = user?.role === 'Admin' ? adminSections : supportSections

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY))
    return stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX ? stored : SIDEBAR_DEFAULT
  })
  const [resizing, setResizing] = useState(false)
  const resizeStateRef = useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const handleResizeStart = useCallback((e) => {
    resizeStateRef.current = { startX: e.clientX, startWidth: sidebarWidth }
    setResizing(true)
  }, [sidebarWidth])

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e) => {
      const { startX, startWidth } = resizeStateRef.current
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + (e.clientX - startX)))
      setSidebarWidth(next)
    }
    const handleMouseUp = () => setResizing(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  useEffect(() => {
    if (!resizing) localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth))
  }, [resizing, sidebarWidth])

  return (
    <div className={`fixed inset-0 flex bg-richblack-900 overflow-hidden ${resizing ? 'select-none cursor-col-resize' : ''}`}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        transition={resizing ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block shrink-0 relative overflow-hidden"
      >
        <div
          style={{ width: sidebarWidth }}
          className="h-full flex flex-col gap-6 border-r border-richblack-700 bg-richblack-800 p-4"
        >
          <SidebarContent pathname={location.pathname} user={user} sections={sections} onLogout={() => dispatch(LogoutUser(navigate))} />
        </div>
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            className="hidden lg:block absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize group z-10"
          >
            <div className={`h-full w-px mx-auto transition-colors duration-150 ${resizing ? 'bg-yellow-50' : 'bg-transparent group-hover:bg-yellow-50/60'}`} />
          </div>
        )}
      </motion.aside>

      <button
        onClick={() => setSidebarCollapsed((v) => !v)}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-20 w-5 h-10 items-center justify-center rounded-r-lg bg-richblack-800 border border-l-0 border-richblack-700 text-richblack-300 hover:text-richblack-5 hover:bg-richblack-700 cursor-pointer"
        style={{ left: sidebarCollapsed ? 0 : sidebarWidth, transition: resizing ? 'none' : 'left 0.25s cubic-bezier(0.16,1,0.3,1), color 0.2s, background-color 0.2s' }}
      >
        {sidebarCollapsed ? <FiChevronRight className="text-xs" /> : <FiChevronLeft className="text-xs" />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial="hidden"
              animate="show"
              exit="exit"
              variants={modalBackdrop}
              className="fixed inset-0 z-50 bg-richblack-900/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col gap-6 bg-richblack-800 border-r border-richblack-700 p-4 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-richblack-400">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="text-richblack-300 hover:text-richblack-5 cursor-pointer">
                  <FiX />
                </button>
              </div>
              <SidebarContent
                pathname={location.pathname}
                user={user}
                sections={sections}
                onNavigate={() => setMobileOpen(false)}
                onLogout={() => { setMobileOpen(false); dispatch(LogoutUser(navigate)) }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* title on the left, search centered in the remaining space sir (per direct request —
            the old horizontal AdminNav had the search box pinned to the far right edge, which
            is exactly where it got clipped once the tab bar ran out of room) */}
        <div className="flex items-center gap-4 px-4 lg:px-6 py-4 border-b border-richblack-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-richblack-200 hover:text-richblack-5 cursor-pointer"
              aria-label="Open menu"
            >
              <FiMenu className="text-lg" />
            </button>
            <h1 className="font-display text-xl text-richblack-5 truncate">{title}</h1>
          </div>
          <div className="flex-1 hidden md:block">
            <GlobalAdminSearch />
          </div>
        </div>
        {/* search still reachable on mobile, just below the title row instead of squeezed
            into it sir */}
        <div className="md:hidden px-4 py-3 border-b border-richblack-700 shrink-0">
          <GlobalAdminSearch />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
