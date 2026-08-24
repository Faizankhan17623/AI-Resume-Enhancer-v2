import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import Loading from './Loading'
import { getTemplateById } from '../ResumeBuilder/Templates/templateRegistry'
import { GetPublicPortfolio } from '../../Services/operations/BuiltResume'

// public, unauthenticated portfolio page sir — a built resume rendered through its real
// template component, reachable via /Portfolio/:shareId. Same shape as SharedReport.jsx's
// public review card, just rendering a resume instead of an ATS score summary.
const SharedPortfolio = () => {
  const { shareId } = useParams()
  const [resume, setResume] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    GetPublicPortfolio(shareId)().then((data) => {
      if (!alive) return
      if (data) setResume(data)
      else setNotFound(true)
      setLoading(false)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId])

  const template = resume ? getTemplateById(resume.templateId) : null

  return (
    <div className="min-h-screen bg-richblack-900 flex flex-col">
      <Helmet>
        <title>{resume?.title ? `${resume.title} | Resumify` : 'Shared Resume | Resumify'}</title>
      </Helmet>

      <div className="border-b border-richblack-700 bg-richblack-900/90 py-4 print:hidden">
        <Link to="/" className="flex items-center gap-2 w-fit mx-auto">
          <MdOutlineDocumentScanner className="text-3xl text-yellow-50" />
          <span className="font-display font-bold text-xl text-richblack-5 tracking-tight">
            Resum<span className="text-warm-200">ify</span>
          </span>
        </Link>
      </div>

      <div className={`flex-1 w-full mx-auto px-4 py-10 ${loading ? 'flex' : ''}`}>
        {loading ? (
          <Loading text="Loading resume..." />
        ) : notFound ? (
          <div className="max-w-2xl mx-auto rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-200 mb-6">This resume was not found or is no longer public.</p>
            <Link to="/" className="text-yellow-50 hover:underline text-sm font-semibold">Go home</Link>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            {/* templates render at a fixed 8.5in width sir (letter page size) — scroll horizontally
                on narrow screens instead of clipping or squashing the layout */}
            <div className="rounded-2xl overflow-x-auto shadow-2xl shadow-richblack-900/20">
              <template.Component data={resume} />
            </div>
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 text-center">
              <p className="text-sm text-richblack-200 mb-3">Want a resume like this?</p>
              <Link to="/Signup" className="inline-block px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:bg-yellow-25 transition-all duration-200">
                Build yours free on Resumify
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharedPortfolio
