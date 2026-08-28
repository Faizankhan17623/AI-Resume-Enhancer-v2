import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { FaDownload, FaCopy, FaExclamationTriangle, FaLightbulb, FaGraduationCap, FaComments, FaShareAlt, FaCheckCircle, FaSearch, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import ScoreRing from '../extra/ScoreRing'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { GetSingleReview, DownloadReviewPdf, ToggleShare, UpdateShareAudience } from '../../Services/operations/Review'
import { apiConnector } from '../../Services/apiConnector'
import { LearningResourcesData } from '../../Services/Apis/LearningResourcesApi'
import { logApiError } from '../../Services/logApiError'

// lazy "find real courses" lookup for one learningRoadmap item sir — only fires on click,
// never on page load, so we don't burn Tavily calls on roadmap items the user never expands
const LearningResourceFinder = ({ query, token }) => {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [results, setResults] = useState([])

  const handleFind = async () => {
    setState('loading')
    try {
      const response = await apiConnector('POST', LearningResourcesData.search, { query }, {
        Authorization: `Bearer ${token}`
      })
      if (!response.data.success) throw new Error(response.data.message)
      setResults(response.data.results || [])
      setState('done')
    } catch (error) {
      logApiError('Error finding learning resources', error)
      setState('error')
    }
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={handleFind}
        className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-blue-100 hover:text-blue-50 transition-colors duration-200"
      >
        <FaSearch className="text-[10px]" /> Find real courses: {query}
      </button>
    )
  }

  if (state === 'loading') {
    return (
      <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-richblack-300">
        <FaSpinner className="text-[10px] animate-spin" /> Searching for courses...
      </p>
    )
  }

  if (state === 'error') {
    return (
      <p className="mt-2 text-xs text-pink-200">
        Couldn't find courses right now.{' '}
        <button type="button" onClick={handleFind} className="underline hover:text-pink-100">Try again</button>
      </p>
    )
  }

  if (results.length === 0) {
    return <p className="mt-2 text-xs text-richblack-400">No real courses found for this search.</p>
  }

  return (
    <div className="mt-2 space-y-2">
      {results.map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start justify-between gap-2 rounded-lg bg-richblack-700/60 border border-richblack-600 px-3 py-2 hover:border-yellow-50/60 transition-colors duration-200 group"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-richblack-5 group-hover:text-yellow-50 transition-colors duration-200 truncate">{r.title}</p>
            <p className="text-[11px] text-richblack-300 line-clamp-2 mt-0.5">{r.snippet}</p>
          </div>
          <FaExternalLinkAlt className="text-richblack-400 group-hover:text-yellow-50 transition-colors duration-200 shrink-0 mt-1 text-[10px]" />
        </a>
      ))}
    </div>
  )
}

// score → color, same rule everywhere sir
const scoreColor = (score) =>
  score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'
const barColor = (score) =>
  score >= 70 ? 'bg-caribgreen-100' : score >= 50 ? 'bg-yellow-50' : 'bg-pink-200'

const priorityBadge = {
  high: 'bg-pink-700/30 text-pink-100 border-pink-700',
  medium: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  low: 'bg-richblack-700 text-richblack-100 border-richblack-600',
}

// one section card wrapper so every block looks the same sir
const Section = ({ title, children }) => (
  <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
    <h2 className="font-display text-lg text-richblack-5 mb-4">{title}</h2>
    {children}
  </div>
)

const copyText = (text) => {
  navigator.clipboard.writeText(text)
  toast.success("Copied to clipboard")
}

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

const Report = () => {
  const { reviewId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { review, loading, isPublic, shareId, shareAudience, formattingCheck } = useSelector((state) => state.review)
  const shareUrl = shareId ? `${window.location.origin}/Shared/${shareId}` : null
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleShareClick = async () => {
    if (isPublic) {
      dispatch(ToggleShare(reviewId, token))
      return
    }
    const { value: audience } = await Swal.fire({
      ...swalDark,
      title: 'Who is this link for?',
      input: 'radio',
      inputOptions: { friend: 'A friend or on social media', recruiter: 'A recruiter or hiring manager' },
      inputValue: 'friend',
      showCancelButton: true,
      confirmButtonText: 'Create link',
    })
    if (audience) dispatch(ToggleShare(reviewId, token, audience))
  }

  const handleChangeAudience = async () => {
    const { value: audience } = await Swal.fire({
      ...swalDark,
      title: 'Who is this link for?',
      input: 'radio',
      inputOptions: { friend: 'A friend or on social media', recruiter: 'A recruiter or hiring manager' },
      inputValue: shareAudience,
      showCancelButton: true,
      confirmButtonText: 'Update',
    })
    if (audience && audience !== shareAudience) dispatch(UpdateShareAudience(reviewId, token, audience))
  }

  useEffect(() => {
    dispatch(GetSingleReview(reviewId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId])

  if (loading || !review) {
    return (
      <DashboardLayout title="Loading review...">
        <Loading text="Loading your review..." />
      </DashboardLayout>
    )
  }

  const breakdownLabels = {
    keywordMatch: 'Keyword Match',
    experienceRelevance: 'Experience Relevance',
    skillsCoverage: 'Skills Coverage',
    formatting: 'Formatting',
  }

  return (
    <DashboardLayout title={review.jdTitle || 'ATS review'}>
      <Helmet>
        <title>ATS Report | Resumify</title>
      </Helmet>

      <AnimatePresence>
      {downloadingPdf && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text="Preparing your PDF..." size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <PageTransition className="h-full overflow-y-auto max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-5">

        {/* Header row sir — score + verdict + PDF */}
        <div className="rounded-2xl bg-richblack-800 shadow-lg shadow-richblack-900/10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <ScoreRing score={review.atsScore} />
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-yellow-900/15 text-yellow-100 mb-3">
              {review.verdict}
            </span>
            <p className="text-richblack-100 leading-relaxed">{review.summary}</p>
            <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
              <IconBtn
                text="Download PDF"
                onclick={() => DownloadReviewPdf(reviewId, token, setDownloadingPdf)}
                customClasses="text-sm"
              >
                <FaDownload />
              </IconBtn>
              <IconBtn
                text={isPublic ? "Unshare" : "Share"}
                onclick={handleShareClick}
                customClasses="text-sm"
                outline
              >
                <FaShareAlt className={isPublic ? "text-yellow-50" : undefined} />
              </IconBtn>
              <Link to="/Dashboard/New-Review">
                <button className="px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                  Re-score after edits
                </button>
              </Link>
            </div>
            {isPublic && shareUrl && (
              <div className="mt-4 max-w-md mx-auto md:mx-0">
                <div className="flex items-center gap-2 rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-2.5">
                  <p className="text-xs text-richblack-200 truncate flex-1">{shareUrl}</p>
                  <button
                    onClick={() => copyText(shareUrl)}
                    className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer shrink-0"
                    title="Copy link"
                  >
                    <FaCopy className="text-sm" />
                  </button>
                </div>
                <p className="text-xs text-richblack-400 mt-1.5">
                  Framed for {shareAudience === 'recruiter' ? 'a recruiter' : 'a friend'} —{' '}
                  <button onClick={handleChangeAudience} className="text-yellow-50 hover:underline cursor-pointer">change</button>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Score Breakdown — card grid sir */}
        {review.scoreBreakdown && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(breakdownLabels).map(([key, label]) => {
              const value = review.scoreBreakdown[key]
              if (typeof value !== 'number') return null
              return (
                <div key={key} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
                  <p className="text-xs font-semibold text-richblack-400 mb-2">{label}</p>
                  <p className={`font-display text-2xl mb-2 ${scoreColor(value)}`}>{value}</p>
                  <div className="w-full h-1.5 rounded-full bg-richblack-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(value)} transition-all duration-1000`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ATS structural formatting scan sir — deterministic, separate from the AI's subjective formatting score above */}
        {formattingCheck && (
          <Section title="ATS Formatting Scan">
            <div className="flex items-center gap-4 mb-4">
              <p className={`font-display text-3xl ${scoreColor(formattingCheck.score)}`}>{formattingCheck.score}</p>
              <p className="text-sm text-richblack-300">
                {formattingCheck.issues?.length > 0
                  ? `${formattingCheck.issues.length} formatting issue${formattingCheck.issues.length > 1 ? 's' : ''} that could trip up real ATS parsers`
                  : 'No structural parsing issues detected — this resume should parse cleanly.'}
              </p>
            </div>
            {formattingCheck.issues?.length > 0 ? (
              <ul className="space-y-3">
                {formattingCheck.issues.map((issue, index) => (
                  <li key={index} className="flex gap-3 items-start">
                    <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border mt-0.5 ${priorityBadge[issue.severity] || priorityBadge.low}`}>
                      {issue.severity}
                    </span>
                    <p className="text-sm text-richblack-100">{issue.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2.5 text-sm text-caribgreen-100">
                <FaCheckCircle /> Single-column, text-based, standard fonts — parser-friendly.
              </div>
            )}
          </Section>
        )}

        {/* ProMax: recruiter first impression sir */}
        {review.recruiterFirstImpression && (
          <Section title="Recruiter's First 10 Seconds">
            <p className="text-richblack-100 leading-relaxed italic">"{review.recruiterFirstImpression}"</p>
          </Section>
        )}

        {/* Strengths + Missing keywords side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {review.strengths?.length > 0 && (
            <Section title="Strengths">
              <ul className="space-y-2.5">
                {review.strengths.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-richblack-100">
                    <span className="text-caribgreen-100 shrink-0">✓</span> {item}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {review.missingKeywords?.length > 0 && (
            <Section title="Missing Keywords">
              <div className="flex flex-wrap gap-2">
                {review.missingKeywords.map((keyword, index) => (
                  <span key={index} className="px-3 py-1.5 text-xs font-medium rounded-full bg-pink-700/20 text-pink-100 border border-pink-700">
                    {keyword}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ProMax: red flags sir */}
        {review.redFlags?.length > 0 && (
          <Section title="Red Flags">
            <ul className="space-y-2.5">
              {review.redFlags.map((item, index) => (
                <li key={index} className="flex gap-3 text-sm text-richblack-100">
                  <FaExclamationTriangle className="text-pink-200 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Pro: keyword analysis in three columns */}
        {review.keywordAnalysis && (
          <Section title="Keyword Analysis">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: 'Matched', words: review.keywordAnalysis.matched, chip: 'bg-caribgreen-700/20 text-caribgreen-25 border-caribgreen-700' },
                { label: 'Weak', words: review.keywordAnalysis.weak, chip: 'bg-yellow-700/20 text-yellow-25 border-yellow-700' },
                { label: 'Missing', words: review.keywordAnalysis.missing, chip: 'bg-pink-700/20 text-pink-100 border-pink-700' },
              ].map((group) => (
                <div key={group.label}>
                  <p className="text-sm font-bold text-richblack-5 mb-3">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {(group.words || []).map((word, index) => (
                      <span key={index} className={`px-2.5 py-1 text-xs font-medium rounded-full border ${group.chip}`}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Pro: section-by-section feedback */}
        {review.sectionFeedback?.length > 0 && (
          <Section title="Section Feedback">
            <div className="space-y-4">
              {review.sectionFeedback.map((section, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <span className={`font-mono font-extrabold text-lg w-10 text-right shrink-0 ${scoreColor(section.score)}`}>
                    {section.score}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-richblack-5">{section.section}</p>
                    <p className="text-sm text-richblack-200 mt-0.5">{section.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Improvements — the before/after cards sir */}
        {review.improvements?.length > 0 && (
          <Section title="Improvements">
            <div className="space-y-5">
              {review.improvements.map((imp, index) => (
                <div key={index} className="rounded-lg bg-richblack-700/40 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-richblack-5">{index + 1}. {imp.issue}</p>
                    <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${priorityBadge[imp.priority] || priorityBadge.low}`}>
                      {imp.priority}
                    </span>
                  </div>
                  {imp.before && (
                    <div className="rounded-md bg-pink-900/20 border border-pink-800/40 px-4 py-2.5 mb-2">
                      <p className="text-xs text-pink-100/80"><span className="font-bold">Before:</span> {imp.before}</p>
                    </div>
                  )}
                  {imp.after && (
                    <div className="relative rounded-md bg-caribgreen-900/30 border border-caribgreen-700/40 px-4 py-2.5">
                      <p className="text-xs text-caribgreen-25 pr-8"><span className="font-bold">After:</span> {imp.after}</p>
                      <button
                        onClick={() => copyText(imp.after)}
                        className="absolute top-2.5 right-3 text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
                        title="Copy"
                      >
                        <FaCopy className="text-sm" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Pro: quick wins */}
        {review.quickWins?.length > 0 && (
          <Section title="Quick Wins">
            <ul className="space-y-2.5">
              {review.quickWins.map((item, index) => (
                <li key={index} className="flex gap-3 text-sm text-richblack-100">
                  <FaLightbulb className="text-yellow-50 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ProMax: rewritten summary with copy sir */}
        {review.rewrittenSummary && (
          <Section title="Your Rewritten Professional Summary">
            <div className="relative rounded-lg bg-richblack-900/60 border border-yellow-800 p-5">
              <p className="text-sm text-richblack-50 leading-relaxed pr-10">{review.rewrittenSummary}</p>
              <button
                onClick={() => copyText(review.rewrittenSummary)}
                className="absolute top-4 right-4 text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer"
                title="Copy"
              >
                <FaCopy />
              </button>
            </div>
          </Section>
        )}

        {/* ProMax: interview prep */}
        {review.interviewPrep?.length > 0 && (
          <Section title="Interview Prep">
            <div className="space-y-5">
              {review.interviewPrep.map((q, index) => (
                <div key={index} className="rounded-lg bg-richblack-700/40 p-5">
                  <p className="text-sm font-bold text-richblack-5 flex gap-2">
                    <FaComments className="text-blue-100 shrink-0 mt-0.5" /> Q{index + 1}. {q.question}
                  </p>
                  {q.whyAsked && <p className="text-xs text-richblack-300 mt-2 italic">Why they ask: {q.whyAsked}</p>}
                  {q.howToAnswer && <p className="text-sm text-richblack-100 mt-2">{q.howToAnswer}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Pro+: learning roadmap */}
        {review.learningRoadmap?.length > 0 && (
          <Section title="Learning Roadmap">
            <div className="space-y-4">
              {review.learningRoadmap.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <FaGraduationCap className="text-caribgreen-100 text-lg shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-bold text-richblack-5">
                      {item.skill}
                      <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${priorityBadge[item.priority] || priorityBadge.low}`}>
                        {item.priority}
                      </span>
                    </p>
                    <p className="text-sm text-richblack-200 mt-1">{item.advice}</p>
                    {item.resourceQuery && (
                      <LearningResourceFinder query={item.resourceQuery} token={token} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </PageTransition>
    </DashboardLayout>
  )
}

export default Report
