import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaEye, FaFileAlt, FaPaperPlane, FaClipboardCheck, FaTrophy, FaTimesCircle, FaArrowLeft } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import Loading from '../extra/Loading'
import { GetJobAnalytics } from '../../Services/operations/Job'

// one funnel stage sir — width is proportional to the FIRST stage (views), not to the
// previous stage, so the bars visually shrink left-to-right the way a real funnel does
const FunnelStage = ({ icon: Icon, label, value, maxValue, accent }) => {
  const pct = maxValue ? Math.max((value / maxValue) * 100, value > 0 ? 3 : 0) : 0
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 shrink-0 flex items-center gap-2 text-xs text-richblack-300">
        <Icon className="text-[13px] opacity-80 shrink-0" /> {label}
      </div>
      <div className="flex-1 h-8 rounded-lg bg-richblack-700/50 overflow-hidden">
        <div
          className={`h-full rounded-lg flex items-center justify-end px-3 transition-all duration-500 ${accent}`}
          style={{ width: `${pct}%` }}
        >
          {pct > 12 && <span className="text-xs font-bold text-richblack-900">{value}</span>}
        </div>
      </div>
      {pct <= 12 && <span className="w-10 text-right text-xs font-bold text-richblack-5">{value}</span>}
    </div>
  )
}

const RateCard = ({ label, value, hint }) => (
  <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
    <p className="text-[11px] uppercase tracking-wide text-richblack-400 mb-1">{label}</p>
    <p className="font-display text-2xl text-richblack-5">{value}%</p>
    {hint && <p className="text-[11px] text-richblack-400 mt-1">{hint}</p>}
  </div>
)

// a recruiter's own funnel for ONE job sir — views (Job.views, incremented in getPublicJob) ->
// applications -> invited to test -> completed the test -> hired/rejected, plus the test's own
// performance numbers (completion rate, avg score, avg violations). Built on GET
// /jobs/:jobId/analytics, one aggregation pass, same Promise.all shape as Admin's dashboard stats.
const JobAnalytics = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { jobAnalytics: data, loading } = useSelector((state) => state.job)

  useEffect(() => {
    dispatch(GetJobAnalytics(jobId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  if (loading || !data) {
    return (
      <RecruiterLayout>
        <Loading text="Loading analytics..." />
      </RecruiterLayout>
    )
  }

  const { funnel, rates, test } = data

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Job Analytics | Resumify Recruiter</title>
      </Helmet>

      <div className="max-w-3xl space-y-6">
        <Link
          to={`/Recruiter/Jobs/${jobId}`}
          className="inline-flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 transition-colors duration-200"
        >
          <FaArrowLeft /> Back to job
        </Link>

        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h1 className="font-display text-lg text-richblack-5 mb-1">Funnel</h1>
          <p className="text-xs text-richblack-400 mb-5">
            How many people saw this job, applied, and made it through screening.
          </p>
          <div className="space-y-3">
            <FunnelStage icon={FaEye} label="Views" value={funnel.views} maxValue={funnel.views} accent="bg-richblack-300" />
            <FunnelStage icon={FaFileAlt} label="Applications" value={funnel.applications} maxValue={funnel.views} accent="bg-warm-200" />
            <FunnelStage icon={FaPaperPlane} label="Invited to test" value={funnel.invitedToTest} maxValue={funnel.views} accent="bg-yellow-50" />
            <FunnelStage icon={FaClipboardCheck} label="Completed test" value={funnel.completedTest} maxValue={funnel.views} accent="bg-blue-100" />
            <FunnelStage icon={FaTrophy} label="Hired" value={funnel.hired} maxValue={funnel.views} accent="bg-caribgreen-100" />
            <FunnelStage icon={FaTimesCircle} label="Rejected" value={funnel.rejected} maxValue={funnel.views} accent="bg-pink-200" />
          </div>
          {funnel.views === 0 && (
            <p className="text-xs text-richblack-400 mt-4">
              No one has viewed this job's public page yet — share the public link to start seeing views here.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RateCard label="View → Apply" value={rates.viewToApplyRate} hint="of viewers applied" />
          <RateCard label="Invite rate" value={rates.applyToInviteRate} hint="of applicants invited" />
          <RateCard label="Test completion" value={rates.testCompletionRate} hint="of attempts finished" />
          <RateCard label="Hire rate" value={rates.hireRate} hint="of applicants hired" />
        </div>

        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="text-sm font-semibold text-richblack-5 mb-4">Test performance</h2>
          {!test ? (
            <p className="text-sm text-richblack-300">No test attached to this job yet.</p>
          ) : test.totalAttempts === 0 ? (
            <p className="text-sm text-richblack-300">No one has started this job's test yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="font-display text-xl text-richblack-5">{test.totalAttempts}</p>
                <p className="text-[11px] text-richblack-400 mt-1">Attempts</p>
              </div>
              <div>
                <p className="font-display text-xl text-richblack-5">{test.avgScore ?? '—'}</p>
                <p className="text-[11px] text-richblack-400 mt-1">Avg score</p>
              </div>
              <div>
                <p className="font-display text-xl text-richblack-5">{test.avgViolations}</p>
                <p className="text-[11px] text-richblack-400 mt-1">Avg violations</p>
              </div>
              <div>
                <p className="font-display text-xl text-richblack-5">{test.terminatedViolations + test.terminatedTimeout}</p>
                <p className="text-[11px] text-richblack-400 mt-1">Terminated early</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </RecruiterLayout>
  )
}

export default JobAnalytics
