import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiSun, FiMoon, FiMenu, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { FaChartPie, FaFilePdf, FaHistory, FaComments, FaTrophy, FaUser, FaFire, FaSignOutAlt, FaCrown, FaEnvelopeOpenText, FaFolderOpen, FaSearch, FaMagic, FaBriefcase, FaKey, FaSwatchbook, FaLayerGroup, FaMicrophoneAlt, FaClipboardCheck, FaLock } from 'react-icons/fa'
import useTheme from '../../Hooks/useTheme'
import QuickActionsFab from '../extra/QuickActionsFab'
import FeedbackModal from '../extra/FeedbackModal'
import { LogoutUser } from '../../Services/operations/Auth'
import { modalBackdrop } from '../../utils/motion'
import { getInitial, getAvatarColor } from '../../utils/avatar'

// one shared shell for every logged-in page sir — sidebar + topbar, matching the approved mockup.
// Admin keeps its own Navbar + AdminNav, this is only for the regular user dashboard area.
// grouped into small labeled sections sir — keeps the list scannable as features keep landing here
const navSections = [
  {
    label: 'Overview',
    links: [
      { name: 'Overview', path: '/Dashboard', icon: FaChartPie, exact: true },
    ],
  },
  {
    label: 'Resumes',
    links: [
      { name: 'New Review', path: '/Dashboard/New-Review', icon: FaFilePdf },
      { name: 'Templates', path: '/Dashboard/Templates', icon: FaSwatchbook },
      { name: 'Build Resume', path: '/Dashboard/Build-Resume', icon: FaMagic },
      { name: 'My Built Resumes', path: '/Dashboard/Built-Resumes', icon: FaLayerGroup },
      { name: 'My Resumes', path: '/Dashboard/Resumes', icon: FaFolderOpen },
      { name: 'History', path: '/Dashboard/History', icon: FaHistory },
      { name: 'Keyword Bank', path: '/Dashboard/Keyword-Bank', icon: FaKey },
    ],
  },
  {
    label: 'Coach',
    links: [
      { name: 'AI Coach', path: '/Dashboard/Chats', icon: FaComments, matchPrefix: '/Dashboard/Chat' },
      { name: 'Cover Letter', path: '/Dashboard/Cover-Letter', icon: FaEnvelopeOpenText },
      { name: 'Job Search', path: '/Dashboard/Job-Search', icon: FaSearch },
      { name: 'Mock Interview', path: '/Dashboard/Mock-Interview', icon: FaMicrophoneAlt, matchPrefix: '/Dashboard/Mock-Interview' },
      { name: 'Applications', path: '/Dashboard/Applications', icon: FaBriefcase },
      { name: 'My Job Applications', path: '/Dashboard/My-Applications', icon: FaClipboardCheck },
    ],
  },
  {
    label: 'Community',
    links: [
      { name: 'Leaderboard', path: '/Dashboard/Leaderboard', icon: FaTrophy },
      { name: 'Account', path: '/Dashboard/Account', icon: FaUser },
    ],
  },
]

const isActive = (link, pathname) => {
  if (link.exact) return pathname === link.path
  if (link.matchPrefix) return pathname.startsWith(link.matchPrefix)
  return pathname.startsWith(link.path)
}

const SidebarContent = ({ pathname, user, streak, onNavigate }) => (
  <>
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
      <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
      <span className="font-display font-bold text-base text-richblack-5 tracking-tight">
        Resum<span className="text-warm-200">ify</span>
      </span>
    </Link>

    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-0.5">
      {/* banned sir — the ENTIRE normal nav is replaced by this one locked item. Every other
          Dashboard route redirects to Suspended anyway (PrivateRoute), so linking to them here
          would just be a dead end; better to make the lock visible instead of pretending
          nothing's wrong */}
      {user?.isBanned ? (
        <nav className="flex flex-col gap-0.5">
          <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Account</span>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-pink-900/15 text-pink-100">
            <FaLock className="text-[15px] shrink-0 opacity-90" /> Suspended by admin
          </div>
        </nav>
      ) : (
        <>
          {navSections.map((section) => (
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

          {/* the admin door sir — same role gate as the old Navbar */}
          {['Admin', 'Support'].includes(user?.role) && (
            <nav className="flex flex-col gap-0.5">
              <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Admin</span>
              <Link
                to="/Admin"
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  pathname.startsWith('/Admin') ? 'bg-pink-900/15 text-pink-100' : 'text-pink-200/80 hover:bg-pink-900/10 hover:text-pink-100'
                }`}
              >
                <FaChartPie className="text-[15px] shrink-0 opacity-90" /> Admin
              </Link>
            </nav>
          )}
        </>
      )}
    </div>

    <div className="mt-auto flex flex-col gap-2.5">
      {streak?.currentStreak > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-900/10 border border-yellow-800/40 text-xs font-bold text-yellow-50">
          <FaFire className="text-pink-200 shrink-0" /> {streak.currentStreak}-day streak
        </div>
      )}
      <div className="px-3 py-2.5 rounded-xl bg-richblack-700/60 border border-richblack-600 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-richblack-5">
          <FaCrown className="text-yellow-50 text-[11px]" /> {user?.SubType || 'Basic'} plan
        </div>
      </div>
    </div>
  </>
)

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 380
const SIDEBAR_DEFAULT = 240 // matches the old fixed w-60
const SIDEBAR_STORAGE_KEY = 'resumify:sidebarWidth'
const SIDEBAR_COLLAPSED_KEY = 'resumify:sidebarCollapsed'

const DashboardLayout = ({ title, children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { streak } = useSelector((state) => state.review)
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  // desktop sidebar width sir — drag the right edge to resize, remembered per-browser
  // (a layout preference, not app data, so localStorage is the right scope — no backend round-trip)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY))
    return stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX ? stored : SIDEBAR_DEFAULT
  })
  const [resizing, setResizing] = useState(false)
  const resizeStateRef = useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT })

  // fully hide/show the desktop sidebar sir — separate from the width above (that's HOW wide it
  // is when open, this is whether it's open at all). Same localStorage-persisted pattern.
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

  // same initial + name-based color as the home page header sir (utils/avatar.js) — was
  // previously its own separate two-letter/flat-yellow implementation, which is why the two
  // headers used to look different

  return (
    <div className={`fixed inset-0 flex bg-richblack-900 overflow-hidden ${resizing ? 'select-none cursor-col-resize' : ''}`}>
      {/* Desktop sidebar sir — width is user-resizable via the drag handle on its right edge,
          and the whole thing can be fully collapsed via the toggle button pinned to its edge.
          overflow-hidden on the wrapper (not SidebarContent itself) so its content doesn't
          reflow/wrap mid-collapse-animation — it just gets clipped as the width animates to 0. */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        transition={resizing ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block shrink-0 relative overflow-hidden"
      >
        <div
          style={{ width: sidebarWidth }}
          className="h-full flex flex-col gap-6 border-r border-richblack-700 bg-richblack-800 p-4"
        >
          <SidebarContent pathname={location.pathname} user={user} streak={streak} />
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

      {/* collapse/expand toggle sir — pinned to the sidebar's right edge so it stays reachable
          whether the sidebar is open or fully hidden, same idea as VS Code/Notion's rail toggle */}
      <button
        onClick={() => setSidebarCollapsed((v) => !v)}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-20 w-5 h-10 items-center justify-center rounded-r-lg bg-richblack-800 border border-l-0 border-richblack-700 text-richblack-300 hover:text-richblack-5 hover:bg-richblack-700 cursor-pointer"
        style={{ left: sidebarCollapsed ? 0 : sidebarWidth, transition: resizing ? 'none' : 'left 0.25s cubic-bezier(0.16,1,0.3,1), color 0.2s, background-color 0.2s' }}
      >
        {sidebarCollapsed ? <FiChevronRight className="text-xs" /> : <FiChevronLeft className="text-xs" />}
      </button>

      {/* Mobile slide-over sir — hidden by default, hamburger-triggered */}
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
              <SidebarContent pathname={location.pathname} user={user} streak={streak} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-richblack-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-richblack-200 hover:text-richblack-5 cursor-pointer"
              aria-label="Open menu"
            >
              <FiMenu className="text-lg" />
            </button>
            <h1 className="font-display text-xl text-richblack-5 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 text-richblack-100 border border-richblack-600 rounded-xl hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
            >
              {theme === 'dark' ? <FiSun className="text-base" /> : <FiMoon className="text-base" />}
            </button>
            <button
              onClick={() => dispatch(LogoutUser(navigate))}
              aria-label="Logout"
              className="hidden sm:flex p-2 text-richblack-100 border border-richblack-600 rounded-xl hover:bg-pink-700/20 hover:text-pink-100 hover:border-pink-700 transition-all duration-200 cursor-pointer"
            >
              <FaSignOutAlt className="text-sm" />
            </button>
            <div
              style={{ backgroundColor: getAvatarColor(user) }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
            >
              {getInitial(user)}
            </div>
          </div>
        </div>

        {/* min-h-0 lets pages opt into their own scroll (e.g. Chat's two-pane layout) sir —
            plain content pages just add their own overflow-y-auto div inside */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>

      <QuickActionsFab />
      <FeedbackModal />
    </div>
  )
}

export default DashboardLayout
