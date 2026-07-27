import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiLogOut, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi'
import { FaFilePdf, FaFolderOpen, FaHistory, FaEnvelopeOpenText, FaComments, FaSearch, FaTrophy, FaUserCog } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import NotificationBell from './NotificationBell'
import { LogoutUser } from '../../Services/operations/Auth'
import useTheme from '../../Hooks/useTheme'

// Resume dropdown sir — every review/library feature we actually ship, so every link goes somewhere real
const resumeMenu = [
  { name: 'New Review', desc: 'Score your resume against a job description', path: '/Dashboard/New-Review', icon: FaFilePdf },
  { name: 'My Resumes', desc: 'Your saved resume library', path: '/Dashboard/Resumes', icon: FaFolderOpen },
  { name: 'History', desc: 'Every review you have run', path: '/Dashboard/History', icon: FaHistory },
  { name: 'Cover Letter', desc: 'Generate a tailored cover letter', path: '/Dashboard/Cover-Letter', icon: FaEnvelopeOpenText },
]

// Tools dropdown sir — the non-resume-specific features
const toolsMenu = [
  { name: 'AI Coach', desc: 'Chat with the AI about your career', path: '/Dashboard/Chats', icon: FaComments },
  { name: 'Job Search', desc: 'Find roles that match your resume', path: '/Dashboard/Job-Search', icon: FaSearch },
  { name: 'Leaderboard', desc: 'See how your score stacks up', path: '/Dashboard/Leaderboard', icon: FaTrophy },
]

// Shared dropdown sir — logged-out users land on Login first, the target page opens right after
const NavDropdown = ({ label, items, active }) => {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)
  const { token } = useSelector((state) => state.auth)

  const openNow = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        className={`flex items-center gap-1 text-sm font-medium transition-colors duration-200 cursor-pointer ${
          active ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
        }`}
      >
        {label} <FiChevronDown className={`text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-72"
          >
            <div className="rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl p-2">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={token ? item.path : '/Login'}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-richblack-700/60 transition-colors duration-150"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-yellow-900/15 flex items-center justify-center text-sm text-yellow-100">
                      <Icon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-richblack-5">{item.name}</p>
                      <p className="text-xs text-richblack-400 mt-0.5">{item.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Glassdoor-style search sir — a plain icon that expands into a text input on click,
// Enter/submit sends the query straight to Job Search (the app's real search feature)
const NavSearch = () => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const submit = (e) => {
    e.preventDefault()
    setOpen(false)
    navigate(token ? '/Dashboard/Job-Search' : '/Login', { state: { query } })
  }

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <AnimatePresence>
        {open && (
          <motion.form
            onSubmit={submit}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs..."
              className="w-full px-3 py-1.5 text-sm rounded-full bg-richblack-800 border border-richblack-600 text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50"
            />
          </motion.form>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Search"
        className="p-2 shrink-0 text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
      >
        <FaSearch className="text-sm" />
      </button>
    </div>
  )
}

// Google-style initial avatar palette sir — picked deterministically from the name so the
// same user always lands on the same color across sessions/devices
const AVATAR_COLORS = ['#F4511E', '#1E88E5', '#43A047', '#8E24AA', '#00897B', '#FB8C00', '#3949AB', '#D81B60']

const getInitial = (user) => {
  const source = user?.firstName || user?.email || ''
  return source.trim().charAt(0).toUpperCase() || '?'
}

const getAvatarColor = (user) => {
  const source = (user?.firstName || '') + (user?.lastName || '') || user?.email || ''
  let hash = 0
  for (let i = 0; i < source.length; i++) hash = source.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Google-style profile sir — a circular initial avatar (first letter of the name, colored by name)
// that opens Account/Logout, replacing the old generic person icon
const ProfileMenu = () => {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const accountPath = user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support' : '/Dashboard/Account'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-haspopup="true"
        aria-expanded={open}
        style={{ backgroundColor: getAvatarColor(user) }}
        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-sm font-semibold text-white hover:opacity-90 transition-all duration-200 cursor-pointer"
      >
        {getInitial(user)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 mt-3 w-56 rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl z-50 p-2"
          >
            <div className="px-3 py-2 border-b border-richblack-700 mb-1">
              <p className="text-sm font-semibold text-richblack-5 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-richblack-400 truncate">{user?.email}</p>
            </div>
            <Link
              to={accountPath}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-richblack-100 hover:bg-richblack-700/60 hover:text-richblack-5 transition-colors duration-150"
            >
              <FaUserCog /> {user?.role === 'Admin' || user?.role === 'Support' ? `${user.role} Dashboard` : 'Account'}
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false)
                dispatch(LogoutUser(navigate))
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-richblack-100 hover:bg-pink-700/20 hover:text-pink-100 transition-colors duration-150 cursor-pointer"
            >
              <FiLogOut /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Navbar = () => {
  const { token, user } = useSelector((state) => state.auth)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const resumeActive = resumeMenu.some((item) => location.pathname === item.path)
  const toolsActive = toolsMenu.some((item) => location.pathname === item.path)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-richblack-700 bg-richblack-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo sir — navy + coral split wordmark, MyPerfectResume-style */}
        <Link to="/" className="flex items-center gap-2 group">
          <MdOutlineDocumentScanner className="text-3xl text-yellow-50 group-hover:rotate-6 transition-transform duration-300" />
          <span className="font-display font-bold text-xl text-richblack-5 tracking-tight">
            Resum<span className="text-warm-200">ify</span>
          </span>
        </Link>

        {/* Center Links sir — Resume/Tools/Pricing always show for everyone, Admin included.
            The Dashboard door link used to live here too, but it's redundant now — the profile
            dropdown's Account/Dashboard entry (see ProfileMenu below) already goes there, and
            AdminNav covers Admin/Support's own navigation. */}
        <div className="hidden md:flex items-center gap-8">
          <NavDropdown label="Resume" items={resumeMenu} active={resumeActive} />
          <NavDropdown label="Tools" items={toolsMenu} active={toolsActive} />
          <Link
            to="/Pricing"
            className={`text-sm font-medium transition-colors duration-200 ${
              location.pathname === '/Pricing' ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
            }`}
          >
            Pricing
          </Link>
        </div>

        {/* Right Side - Auth Area */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* light/dark toggle sir — persisted to localStorage, defaults to system preference */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 shrink-0 text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
          >
            {theme === 'dark' ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
          </button>
          {token === null ? (
            <>
              <Link to="/Login">
                <button className="whitespace-nowrap px-3 sm:px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                  Log in
                </button>
              </Link>
              <Link to="/Signup">
                <IconBtn text="Sign up" customClasses="text-sm whitespace-nowrap px-3 sm:px-4" />
              </Link>
            </>
          ) : (
            <>
              <NavSearch />
              <NotificationBell />
              {/* plan badge sir — Basic/Pro/ProMax is a User-only concept, Admin/Support
                  accounts have no plan at all, so this never shows for them */}
              {user?.role === 'User' && (
                <span className="hidden sm:inline-block px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-yellow-50 border border-richblack-600">
                  {user?.SubType || 'Basic'}
                </span>
              )}
              <ProfileMenu />
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
