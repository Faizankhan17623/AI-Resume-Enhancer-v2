import { Link } from 'react-router-dom'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import { FaGithub } from 'react-icons/fa'

const Footer = () => {
  return (
    <footer className="w-full border-t border-richblack-700 bg-richblack-900">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Left - brand sir */}
        <div className="flex items-center gap-2">
          <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
          <span className="font-display text-lg text-richblack-5">
            Resume<span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">Enhancer</span>
          </span>
        </div>

        {/* Center - links */}
        <div className="flex items-center gap-6 text-sm text-richblack-300">
          <Link to="/" className="hover:text-richblack-5 transition-colors duration-200">Home</Link>
          <Link to="/Pricing" className="hover:text-richblack-5 transition-colors duration-200">Pricing</Link>
          <Link to="/Login" className="hover:text-richblack-5 transition-colors duration-200">Log in</Link>
        </div>

        {/* Right - socials sir */}
        <div className="flex items-center gap-4">
          <a href="https://github.com/Faizankhan17623" target="_blank" rel="noreferrer" className="text-richblack-300 hover:text-richblack-5 text-xl transition-colors duration-200">
            <FaGithub />
          </a>
        </div>
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
