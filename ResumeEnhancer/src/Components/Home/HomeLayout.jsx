import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiSun, FiMoon, FiMenu, FiX, FiChevronLeft, FiChevronRight, FiUser } from 'react-icons/fi'
import { FaSearch, FaBriefcase, FaTags, FaSignOutAlt, FaCrown } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import NotificationBell from './NotificationBell'
import { resumeMenu, toolsMenu } from '../../utils/homeNavLinks'
import { LogoutUser } from '../../Services/operations/Auth'
import useTheme from '../../Hooks/useTheme'
import { modalBackdrop } from '../../utils/motion'
import { getInitial, getAvatarColor } from '../../utils/avatar'

// same shell as DashboardLayout.jsx sir, ported to the public marketing pages (Landing, Pricing,
// Jobs board, Job detail, For Recruiters) per direct request — a narrow resizable/collapsible
// left sidebar instead of the old full-width top Navbar. Navbar.jsx itself is untouched and still
// used elsewhere (Admin/Support pages alongside AdminNav, Login/Signup/OTP/password pages) —
// this is deliberately scoped to just the public marketing routes.
const exploreMenu = [
  { name: 'Job Search', desc: 'Browse the public job board', path: '/Jobs', icon: FaSearch },
  { name: 'Pricing', desc: 'Compare plans and pick one', path: '/Pricing', icon: FaTags },
  { name: 'For Recruiters', desc: 'Post jobs and screen candidates', path: '/For-Recruiters', icon: FaBriefcase },
]

const isActive = (link, pathname) => pathname === link.path || (link.path !== '/' && pathname.startsWith(link.path))

const HomeSidebarContent = ({ pathname, isLoggedIn, user, onNavigate, onLogout }) => (
  <>
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
      <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
      <span className="font-display font-bold text-base text-richblack-5 tracking-tight">
        Resum<span className="text-warm-200">ify</span>
      </span>
    </Link>

    <div className="flex-1 min-h-0 overflow-y-auto hairline-scrollbar flex flex-col gap-4 pr-0.5">
      <nav className="flex flex-col gap-0.5">
        <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Resume</span>
        {resumeMenu.map((link) => {
          const Icon = link.icon
          const active = isLoggedIn && isActive(link, pathname)
          return (
            <Link
              key={link.path}
              to={isLoggedIn ? link.path : '/Login'}
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

      <nav className="flex flex-col gap-0.5">
        <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Tools</span>
        {toolsMenu.map((link) => {
          const Icon = link.icon
          const active = isLoggedIn && isActive(link, pathname)
          return (
            <Link
              key={link.path}
              to={isLoggedIn ? link.path : '/Login'}
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

      <nav className="flex flex-col gap-0.5">
        <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Explore</span>
        {exploreMenu.map((link) => {
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
    </div>

    <div className="mt-auto flex flex-col gap-2.5">
      {isLoggedIn ? (
        <div className="flex items-center gap-1 rounded-xl hover:bg-richblack-700/60 transition-colors duration-150">
          <Link
            to={user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support' : '/Dashboard/Account'}
            onClick={onNavigate}
            className="flex items-center gap-2.5 px-2 py-2 flex-1 min-w-0 text-left cursor-pointer"
          >
            <div
              style={{ backgroundColor: getAvatarColor(user) }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
            >
              {getInitial(user)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-richblack-5 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="flex items-center gap-1 text-[11px] text-richblack-300">
                <FaCrown className="text-yellow-50 text-[10px] shrink-0" /> {user?.SubType || 'Basic'} plan
              </p>
            </div>
          </Link>
          <button
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="self-stretch px-3 flex items-center justify-center text-richblack-500 hover:text-pink-200 hover:bg-pink-700/10 rounded-r-xl transition-colors duration-150 cursor-pointer shrink-0"
          >
            <FaSignOutAlt className="text-base" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-1">
          <Link to="/Login" onClick={onNavigate}>
            <button className="w-full px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
              Log in
            </button>
          </Link>
          <Link to="/Signup" onClick={onNavigate}>
            <IconBtn text="Sign up" customClasses="w-full justify-center text-sm" />
          </Link>
        </div>
      )}
    </div>
  </>
)

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 380
const SIDEBAR_DEFAULT = 240
// deliberately separate from Dashboard's own resumify:sidebarWidth/sidebarCollapsed keys sir —
// a visitor may want the Home sidebar sized/collapsed differently than their Dashboard one, and
// sharing the key would make the two contexts fight over one stored preference
const SIDEBAR_STORAGE_KEY = 'resumify:homeSidebarWidth'
const SIDEBAR_COLLAPSED_KEY = 'resumify:homeSidebarCollapsed'

const HomeLayout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isLoggedIn, user } = useSelector((state) => state.auth)
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef(null)
  const searchWrapperRef = useRef(null)

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

  // glassdoor-style search sir — same behavior as Navbar's NavSearch, just living in this
  // shell's topbar instead
  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) setSearchOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [searchOpen])

  const submitSearch = (e) => {
    e.preventDefault()
    setSearchOpen(false)
    navigate(isLoggedIn ? '/Dashboard/Job-Search' : '/Login', { state: { query: search } })
  }

  return (
    <div className={`fixed inset-0 flex bg-richblack-900 overflow-hidden ${resizing ? 'select-none cursor-col-resize' : ''}`}>
      {/* Desktop sidebar sir — same resize/collapse mechanics as DashboardLayout.jsx */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        transition={resizing ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block shrink-0 relative overflow-hidden"
      >
        <div
          style={{ width: sidebarWidth }}
          className="h-full flex flex-col gap-6 border-r border-richblack-700 bg-richblack-800 p-4"
        >
          <HomeSidebarContent
            pathname={location.pathname}
            isLoggedIn={isLoggedIn}
            user={user}
            onLogout={() => dispatch(LogoutUser(navigate))}
          />
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

      {/* Mobile slide-over sir — identical shape to DashboardLayout's */}
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
              <HomeSidebarContent
                pathname={location.pathname}
                isLoggedIn={isLoggedIn}
                user={user}
                onNavigate={() => setMobileOpen(false)}
                onLogout={() => { setMobileOpen(false); dispatch(LogoutUser(navigate)) }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16 border-b border-richblack-700 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 text-richblack-200 hover:text-richblack-5 cursor-pointer"
            aria-label="Open menu"
          >
            <FiMenu className="text-lg" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 shrink-0 text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
            >
              {theme === 'dark' ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
            </button>

            {isLoggedIn && (
              <>
                <div ref={searchWrapperRef} className="relative flex items-center">
                  <AnimatePresence>
                    {searchOpen && (
                      <motion.form
                        onSubmit={submitSearch}
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 200, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search jobs..."
                          className="w-full px-3 py-1.5 text-sm rounded-full bg-richblack-800 border border-richblack-600 text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50"
                        />
                      </motion.form>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => setSearchOpen((v) => !v)}
                    aria-label="Search"
                    className="p-2 shrink-0 text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
                  >
                    <FaSearch className="text-sm" />
                  </button>
                </div>
                <NotificationBell />
              </>
            )}

            {/* mobile-only avatar/logout shortcut sir, same fallback DashboardLayout uses when
                the sidebar itself is off-screen (mobile) or collapsed (desktop) */}
            <button
              onClick={() => (sidebarCollapsed ? navigate(isLoggedIn ? '/Dashboard/Account' : '/Login') : setMobileOpen(true))}
              aria-label="Open menu"
              className="lg:hidden"
            >
              {isLoggedIn ? (
                <div
                  style={{ backgroundColor: getAvatarColor(user) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                >
                  {getInitial(user)}
                </div>
              ) : (
                <FiUser className="text-lg text-richblack-200" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default HomeLayout
