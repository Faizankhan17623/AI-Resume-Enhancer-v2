import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaDownload, FaCopy, FaExclamationTriangle, FaLightbulb, FaGraduationCap, FaComments } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Loading from '../extra/Loading'
import ScoreRing from '../extra/ScoreRing'
import IconBtn from '../extra/IconBtn'
import { GetSingleReview, DownloadReviewPdf } from '../../Services/operations/Review'

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
  <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-6">
    <h2 className="text-richblack-5 font-bold text-lg mb-4">{title}</h2>
    {children}
  </div>
)

const copyText = (text) => {
  navigator.clipboard.writeText(text)
  toast.success("Copied to clipboard")
}

const Report = () => {
  const { reviewId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { review, loading } = useSelector((state) => state.review)

  useEffect(() => {
    dispatch(GetSingleReview(reviewId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId])

  if (loading || !review) {
    return (
      <div className="min-h-screen w-full bg-richblack-900">
        <Navbar />
        <Loading text="Loading your review..." />
      </div>
    )
  }

  const breakdownLabels = {
    keywordMatch: 'Keyword Match',
    experienceRelevance: 'Experience Relevance',
    skillsCoverage: 'Skills Coverage',
    formatting: 'Formatting',
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>ATS Report | ResumeEnhancer</title>
      </Helmet>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6 animate-fadeIn">

        {/* Header row sir — score + verdict + PDF */}
        <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-8 flex flex-col md:flex-row items-center gap-8">
          <ScoreRing score={review.atsScore} />
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-richblack-700 text-yellow-50 border border-richblack-600 mb-3">
              {review.verdict}
            </span>
            <p className="text-richblack-100 leading-relaxed">{review.summary}</p>
            <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
              <IconBtn
                text="Download PDF"
                onclick={() => DownloadReviewPdf(reviewId, token)}
                customClasses="text-sm"
              >
                <FaDownload />
              </IconBtn>
              <Link to="/Dashboard/New-Review">
                <button className="px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                  Re-score after edits
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Score Breakdown bars */}
        {review.scoreBreakdown && (
          <Section title="Score Breakdown">
            <div className="space-y-4">
              {Object.entries(breakdownLabels).map(([key, label]) => {
                const value = review.scoreBreakdown[key]
                if (typeof value !== 'number') return null
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-richblack-100">{label}</span>
                      <span className={`font-bold font-mono ${scoreColor(value)}`}>{value}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-richblack-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(value)} transition-all duration-1000`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
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
                <div key={index} className="rounded-lg border border-richblack-700 bg-richblack-900/50 p-5">
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
                <div key={index} className="rounded-lg border border-richblack-700 bg-richblack-900/50 p-5">
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

        {/* ProMax: learning roadmap */}
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
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

export default Report
