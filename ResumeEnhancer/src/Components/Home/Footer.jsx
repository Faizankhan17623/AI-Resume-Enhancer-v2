import { Link } from 'react-router-dom'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'

const footerColumns = [
  {
    title: 'Resume',
    links: [
      { name: 'New Review', path: '/Dashboard/New-Review' },
      { name: 'My Resumes', path: '/Dashboard/Resumes' },
      { name: 'History', path: '/Dashboard/History' },
      { name: 'Cover Letter', path: '/Dashboard/Cover-Letter' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { name: 'AI Coach', path: '/Dashboard/Chats' },
      { name: 'Job Search', path: '/Dashboard/Job-Search' },
      { name: 'Leaderboard', path: '/Dashboard/Leaderboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'Pricing', path: '/Pricing' },
      { name: 'Log in', path: '/Login' },
      { name: 'Sign up', path: '/Signup' },
    ],
  },
]

const Footer = () => {
  return (
    <footer className="relative w-full bg-richblack-800 dark:bg-richblack-900">
      {/* wave divider sir — curved corner cut into the section above, MyPerfectResume-style */}
      <svg
        className="absolute -top-px left-0 w-full h-10 text-richblack-800 dark:text-richblack-900"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path fill="currentColor" d="M0,60 C480,0 960,0 1440,60 L1440,0 L0,0 Z" />
      </svg>

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">

          {/* Brand + socials sir */}
          <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
              <span className="font-display font-bold text-lg text-richblack-5">
                Resum<span className="text-warm-200">ify</span>
              </span>
            </Link>
            <p className="text-sm text-richblack-300 max-w-xs leading-relaxed">
              AI-powered ATS resume reviews, tailored cover letters, and career tools to help you land more interviews.
            </p>
            <div className="flex items-center gap-4 mt-1">
              <a href="https://github.com/Faizankhan17623" target="_blank" rel="noreferrer" className="text-richblack-300 hover:text-richblack-5 text-lg transition-colors duration-200">
                <FaGithub />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-richblack-300 hover:text-richblack-5 text-lg transition-colors duration-200">
                <FaLinkedin />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-richblack-300 hover:text-richblack-5 text-lg transition-colors duration-200">
                <FaTwitter />
              </a>
            </div>
            <Link to="/Signup" className="mt-2 w-fit">
              <IconBtn text="Build my resume" customClasses="text-sm" />
            </Link>
          </div>

          {/* Link columns sir */}
          {footerColumns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-richblack-400">{col.title}</p>
              {col.links.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm text-richblack-300 hover:text-richblack-5 transition-colors duration-200 w-fit"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-richblack-700 py-4">
        <p className="text-center text-xs text-richblack-400">
          © {new Date().getFullYear()} Resumify — Built by Faizan Khan
        </p>
      </div>
    </footer>
  )
}

export default Footer
