import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { MdOutlineDocumentScanner } from 'react-icons/md'

// shared shell for the three legal pages sir (Privacy, Terms, Refund & Cancellation) — same
// header/back-link/typography as SharedReport.jsx's public-page pattern, so a visitor lands on
// something that still looks like the rest of the site, not a bare unstyled text dump.
const LegalPage = ({ title, updatedAt, children }) => (
  <div className="min-h-screen bg-richblack-900 flex flex-col">
    <Helmet>
      <title>{title} | Resumify</title>
    </Helmet>

    <div className="border-b border-richblack-700 bg-richblack-900/90 py-4">
      <Link to="/" className="flex items-center gap-2 w-fit mx-auto">
        <MdOutlineDocumentScanner className="text-3xl text-yellow-50" />
        <span className="font-display font-bold text-xl text-richblack-5 tracking-tight">
          Resum<span className="text-warm-200">ify</span>
        </span>
      </Link>
    </div>

    <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
      <h1 className="font-display text-3xl text-richblack-5 mb-2">{title}</h1>
      <p className="text-xs text-richblack-400 mb-10">Last updated {updatedAt}</p>
      <div className="space-y-8 text-sm text-richblack-100 leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-richblack-5 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-yellow-50 [&_a]:hover:underline">
        {children}
      </div>

      <div className="mt-14 pt-6 border-t border-richblack-700 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <Link to="/Privacy-Policy" className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200">Privacy Policy</Link>
        <Link to="/Terms-And-Conditions" className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200">Terms &amp; Conditions</Link>
        <Link to="/Refund-Policy" className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200">Refund &amp; Cancellation</Link>
      </div>
    </div>
  </div>
)

export default LegalPage
