import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiLogOut, FiSun, FiMoon } from 'react-icons/fi'
import IconBtn from '../extra/IconBtn'
import { LogoutUser } from '../../Services/operations/Auth'
import useTheme from '../../Hooks/useTheme'

const Navbar = () => {
  const { token, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/Pricing' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-richblack-700 bg-richblack-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo sir */}
        <Link to="/" className="flex items-center gap-2 group">
          <MdOutlineDocumentScanner className="text-3xl text-yellow-50 group-hover:rotate-6 transition-transform duration-300" />
          <span className="font-display text-xl text-richblack-5 tracking-tight">
            Resume<span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">Enhancer</span>
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.path ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {token && (
            <>
              <Link
                to="/Dashboard"
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname === '/Dashboard' ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/Dashboard/Chats"
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname.startsWith('/Dashboard/Chat') ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
                }`}
              >
                AI Coach
              </Link>
              <Link
                to="/Dashboard/Account"
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname === '/Dashboard/Account' ? 'text-yellow-50' : 'text-richblack-100 hover:text-richblack-5'
                }`}
              >
                Account
              </Link>
            </>
          )}
          {/* the admin door sir — only Admin and Support ever see this link */}
          {token && ['Admin', 'Support'].includes(user?.role) && (
            <Link
              to="/Admin"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname.startsWith('/Admin') ? 'text-yellow-50' : 'text-pink-100 hover:text-richblack-5'
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right Side - Auth Area */}
        <div className="flex items-center gap-3">
          {/* light/dark toggle sir — persisted to localStorage, defaults to system preference */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
          >
            {theme === 'dark' ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
          </button>
          {token === null ? (
            <>
              <Link to="/Login">
                <button className="px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                  Log in
                </button>
              </Link>
              <Link to="/Signup">
                <IconBtn text="Sign up" customClasses="text-sm" />
              </Link>
            </>
          ) : (
            <>
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
