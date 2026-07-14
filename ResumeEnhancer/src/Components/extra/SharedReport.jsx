import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { MdOutlineDocumentScanner } from 'react-icons/md'
import Loading from './Loading'
import ScoreRing from './ScoreRing'
import { GetPublicReview } from '../../Services/operations/Review'

const scoreColor = (score) =>
  score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'
const barColor = (score) =>
  score >= 70 ? 'bg-caribgreen-100' : score >= 50 ? 'bg-yellow-50' : 'bg-pink-200'

const breakdownLabels = {
  keywordMatch: 'Keyword Match',
  experienceRelevance: 'Experience Relevance',
  skillsCoverage: 'Skills Coverage',
  formatting: 'Formatting',
}

// public, unauthenticated report card sir — a safe subset of one review, reachable via /Shared/:shareId
const SharedReport = () => {
  const { shareId } = useParams()
  const dispatch = useDispatch()
  const [report, setReport] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    dispatch(GetPublicReview(shareId)).then((data) => {
      if (!alive) return
      if (data) setReport(data)
      else setNotFound(true)
      setLoading(false)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId])

  return (
    <div className="min-h-screen bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Shared ATS Report | Resumify</title>
      </Helmet>

      <div className="border-b border-richblack-700 bg-richblack-900/90 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit mx-auto">
          <MdOutlineDocumentScanner className="text-3xl text-yellow-50" />
          <span className="font-display font-bold text-xl text-richblack-5 tracking-tight">
            Resum<span className="text-warm-200">ify</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">
        {loading ? (
          <Loading text="Loading shared report..." />
        ) : notFound ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <p className="text-richblack-200 mb-6">This shared report was not found or is no longer public.</p>
            <Link to="/" className="text-yellow-50 hover:underline text-sm font-semibold">Go home</Link>
          </div>
        ) : (
          <div className="space-y-5 animate-fadeIn">
            <div className="rounded-2xl bg-richblack-800 shadow-lg shadow-richblack-900/10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <ScoreRing score={report.atsScore} />
              <div className="flex-1 text-center md:text-left">
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-yellow-900/15 text-yellow-100 mb-3">
                  {report.verdict}
                </span>
                <p className="text-richblack-100 leading-relaxed">{report.summary}</p>
                <p className="text-xs text-richblack-400 mt-3">Reviewed on {new Date(report.createdAt).toDateString()}</p>
              </div>
            </div>

            {report.scoreBreakdown && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(breakdownLabels).map(([key, label]) => {
                  const value = report.scoreBreakdown[key]
                  if (typeof value !== 'number') return null
                  return (
                    <div key={key} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
                      <p className="text-xs font-semibold text-richblack-400 mb-2">{label}</p>
                      <p className={`font-display text-2xl mb-2 ${scoreColor(value)}`}>{value}</p>
                      <div className="w-full h-1.5 rounded-full bg-richblack-700 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {report.strengths?.length > 0 && (
              <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
                <h2 className="font-display text-lg text-richblack-5 mb-4">Strengths</h2>
                <ul className="space-y-2.5">
                  {report.strengths.map((item, index) => (
                    <li key={index} className="flex gap-3 text-sm text-richblack-100">
                      <span className="text-caribgreen-100 shrink-0">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 text-center">
              <p className="text-sm text-richblack-200 mb-3">Want to see how your resume scores?</p>
              <Link to="/Signup" className="inline-block px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:bg-yellow-25 transition-all duration-200">
                Try Resumify free
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharedReport
