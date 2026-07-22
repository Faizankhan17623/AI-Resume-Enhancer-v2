import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiLogOut, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi'
import { FaFilePdf, FaFolderOpen, FaHistory, FaEnvelopeOpenText, FaComments, FaSearch, FaTrophy } from 'react-icons/fa'
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

const Navbar = () => {
  const { token, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
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

        {/* Center Links */}
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
          {/* only a plain User sees this sir — Admin/Support are fully isolated to their
              own dashboards and can't use the product's Dashboard pages at all */}
          {token && user?.role !== 'Admin' && user?.role !== 'Support' && (
            <Link
              to="/Dashboard"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/Dashboard' ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
              }`}
            >
              Dashboard
            </Link>
          )}
          {/* the admin/support door sir — each role gets sent to its OWN dashboard, never
              a shared one. An Admin sees "Admin" -> /Admin, a Support user sees
              "Support" -> /Support. */}
          {token && user?.role === 'Admin' && (
            <Link
              to="/Admin"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname.startsWith('/Admin') ? 'text-yellow-50' : 'text-pink-100 hover:text-richblack-5'
              }`}
            >
              Admin
            </Link>
          )}
          {token && user?.role === 'Support' && (
            <Link
              to="/Support"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname.startsWith('/Support') ? 'text-yellow-50' : 'text-pink-100 hover:text-richblack-5'
              }`}
            >
              Support
            </Link>
          )}
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
              <NotificationBell />
              {/* plan badge sir — shows what tier the user is on */}
              <span className="hidden sm:inline-block px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-yellow-50 border border-richblack-600">
                {user?.SubType || 'Basic'}
              </span>
              <span className="text-sm text-richblack-100 hidden sm:inline">Hi, {user?.firstName}</span>
              <button
                onClick={() => dispatch(LogoutUser(navigate))}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-pink-700/20 hover:text-pink-100 hover:border-pink-700 transition-all duration-200 cursor-pointer"
              >
                <FiLogOut /> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
