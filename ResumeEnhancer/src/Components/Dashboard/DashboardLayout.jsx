import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi'
import { FaChartPie, FaFilePdf, FaHistory, FaComments, FaTrophy, FaUser, FaFire, FaSignOutAlt, FaCrown, FaEnvelopeOpenText } from 'react-icons/fa'
import useTheme from '../../Hooks/useTheme'
import { LogoutUser } from '../../Services/operations/Auth'

// one shared shell for every logged-in page sir — sidebar + topbar, matching the approved mockup.
// Admin keeps its own Navbar + AdminNav, this is only for the regular user dashboard area.
const workspaceLinks = [
  { name: 'Overview', path: '/Dashboard', icon: FaChartPie, exact: true },
  { name: 'New Review', path: '/Dashboard/New-Review', icon: FaFilePdf },
  { name: 'History', path: '/Dashboard/History', icon: FaHistory },
  { name: 'AI Coach', path: '/Dashboard/Chats', icon: FaComments, matchPrefix: '/Dashboard/Chat' },
  { name: 'Cover Letter', path: '/Dashboard/Cover-Letter', icon: FaEnvelopeOpenText },
]

const communityLinks = [
  { name: 'Leaderboard', path: '/Dashboard/Leaderboard', icon: FaTrophy },
  { name: 'Account', path: '/Dashboard/Account', icon: FaUser },
]

const isActive = (link, pathname) => {
  if (link.exact) return pathname === link.path
  if (link.matchPrefix) return pathname.startsWith(link.matchPrefix)
  return pathname.startsWith(link.path)
}

const SidebarContent = ({ pathname, user, streak, onNavigate }) => (
  <>
    <Link to="/Dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
      <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
      <span className="font-display text-base text-richblack-5 tracking-tight">
        Resume<span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">Enhancer</span>
      </span>
    </Link>

    <nav className="flex flex-col gap-0.5">
      <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Workspace</span>
      {workspaceLinks.map((link) => {
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

    <nav className="flex flex-col gap-0.5">
      <span className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-richblack-400">Community</span>
      {communityLinks.map((link) => {
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
      {/* the admin door sir — same role gate as the old Navbar */}
      {['Admin', 'Support'].includes(user?.role) && (
        <Link
          to="/Admin"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
            pathname.startsWith('/Admin') ? 'bg-pink-900/15 text-pink-100' : 'text-pink-200/80 hover:bg-pink-900/10 hover:text-pink-100'
          }`}
        >
          <FaChartPie className="text-[15px] shrink-0 opacity-90" /> Admin
        </Link>
      )}
    </nav>

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

const DashboardLayout = ({ title, children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { streak } = useSelector((state) => state.review)
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div className="h-screen w-full flex bg-richblack-900 overflow-hidden">
      {/* Desktop sidebar sir */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-6 border-r border-richblack-700 bg-richblack-800 p-4">
        <SidebarContent pathname={location.pathname} user={user} streak={streak} />
      </aside>

      {/* Mobile slide-over sir — hidden by default, hamburger-triggered */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-richblack-900/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col gap-6 bg-richblack-800 border-r border-richblack-700 p-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-richblack-400">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-richblack-300 hover:text-richblack-5 cursor-pointer">
                <FiX />
              </button>
            </div>
            <SidebarContent pathname={location.pathname} user={user} streak={streak} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

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
            <div className="w-8 h-8 rounded-full bg-yellow-900/30 flex items-center justify-center text-xs font-bold text-yellow-100 shrink-0">
              {initials || <FaUser className="text-[10px]" />}
            </div>
          </div>
        </div>

        {/* min-h-0 lets pages opt into their own scroll (e.g. Chat's two-pane layout) sir —
            plain content pages just add their own overflow-y-auto div inside */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
