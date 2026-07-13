import { Link } from 'react-router-dom'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa'

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
    <footer className="w-full border-t border-richblack-700 bg-richblack-900">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">

        {/* Brand + socials sir */}
        <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
            <span className="font-display text-lg text-richblack-5">
              Resume<span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">Enhancer</span>
            </span>
          </Link>
          <p className="text-sm text-richblack-400 max-w-xs leading-relaxed">
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

      <div className="border-t border-richblack-800 py-4">
        <p className="text-center text-xs text-richblack-400">
          © {new Date().getFullYear()} ResumeEnhancer — Built by Faizan Khan
        </p>
      </div>
    </footer>
  )
}

export default Footer
