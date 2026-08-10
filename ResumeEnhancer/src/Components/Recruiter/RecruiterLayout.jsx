import { useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FiSun, FiMoon, FiLogOut } from 'react-icons/fi'
import { FaLock } from 'react-icons/fa'
import RecruiterNav from './RecruiterNav'
import PageTransition from '../extra/PageTransition'
import useTheme from '../../Hooks/useTheme'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import { LogoutUser } from '../../Services/operations/Auth'
import { getInitial, getAvatarColor } from '../../utils/avatar'

// a small, self-contained top bar sir — deliberately NOT the candidate Navbar (its Resume/Tools
// dropdowns are all candidate-only features that make no sense here), same visual language though
const RecruiterLayout = ({ children }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const { theme, toggleTheme } = useTheme()
  const { isLocked, approvalStatus } = useRecruiterLock()

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <div className="flex items-center justify-between px-6 py-4 border-b border-richblack-700">
        <div className="flex items-center gap-2.5">
          <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
          <span className="font-display font-bold text-base text-richblack-5 tracking-tight">
            Resum<span className="text-warm-200">ify</span> <span className="text-richblack-400 font-normal">· Recruiter</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
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
            className="p-2 text-richblack-100 border border-richblack-600 rounded-xl hover:bg-pink-700/20 hover:text-pink-100 hover:border-pink-700 transition-all duration-200 cursor-pointer"
          >
            <FiLogOut className="text-sm" />
          </button>
          <div
            style={{ backgroundColor: getAvatarColor(user) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
          >
            {getInitial(user)}
          </div>
        </div>
      </div>
      {isLocked && (
        <div className={`px-6 py-3 flex items-center gap-2.5 text-sm border-b ${
          approvalStatus === 'rejected'
            ? 'bg-pink-700/10 border-pink-700 text-pink-100'
            : 'bg-yellow-700/10 border-yellow-700 text-yellow-25'
        }`}>
          <FaLock className="shrink-0" />
          {approvalStatus === 'rejected'
            ? "Your recruiter application wasn't approved — every action is locked. Contact support to appeal."
            : 'Your recruiter account is pending admin approval — you can look around, but posting jobs and every other action is locked until then.'}
        </div>
      )}
      <RecruiterNav />
      <PageTransition className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </PageTransition>
    </div>
  )
}

export default RecruiterLayout
