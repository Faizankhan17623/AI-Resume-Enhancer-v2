import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaEye, FaFileAlt, FaTrophy, FaBriefcase } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import Loading from '../extra/Loading'
import { GetRecruiterOverviewAnalytics } from '../../Services/operations/Job'

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
    <div className="flex items-center gap-2 text-richblack-400 mb-1">
      <Icon className="text-[13px]" />
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
    </div>
    <p className="font-display text-2xl text-richblack-5">{value}</p>
  </div>
)

const statusBadge = {
  draft: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  published: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  closed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

// a recruiter's totals ACROSS every job they've posted sir, plus a per-job breakdown ranked by
// hires so the strongest posting surfaces without opening each job's own funnel individually.
// Built on GET /jobs/analytics-overview — see controllers/Job.js's getRecruiterOverviewAnalytics.
const RecruiterOverview = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { recruiterOverview: data, loading } = useSelector((state) => state.job)

  useEffect(() => {
    dispatch(GetRecruiterOverviewAnalytics(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !data) {
    return (
      <RecruiterLayout>
        <Loading text="Loading your analytics..." />
      </RecruiterLayout>
    )
  }

  const { totals, jobs } = data

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Analytics Overview | Resumify Recruiter</title>
      </Helmet>

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-xl text-richblack-5 mb-1">Analytics overview</h1>
          <p className="text-xs text-richblack-400">Totals across all {totals.jobs} of your job postings.</p>
        </div>

        {totals.jobs === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-300 text-sm">Post a job to start seeing analytics here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={FaEye} label="Total views" value={totals.views} />
              <StatCard icon={FaFileAlt} label="Applications" value={totals.applications} />
              <StatCard icon={FaTrophy} label="Hired" value={totals.hired} />
              <StatCard icon={FaBriefcase} label="Hire rate" value={`${totals.hireRate}%`} />
            </div>

            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
              <h2 className="text-sm font-semibold text-richblack-5 mb-1">Jobs, ranked by hires</h2>
              <p className="text-xs text-richblack-400 mb-4">Your best-performing postings, most hires first.</p>
              <div className="space-y-3">
                {jobs.map((job) => (
                  <Link
                    key={job._id}
                    to={`/Recruiter/Jobs/${job._id}/analytics`}
                    className="block rounded-lg bg-richblack-700/40 hover:bg-richblack-700/70 transition-colors duration-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-richblack-5 font-semibold text-sm truncate">{job.title}</h3>
                          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[job.status]}`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-richblack-400">
                          {job.views} views · {job.applications} applications · {job.hired} hired
                          {job.avgFitScore !== null && ` · avg fit score ${job.avgFitScore}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg text-richblack-5">{job.hireRate}%</p>
                        <p className="text-[10px] text-richblack-400">hire rate</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </RecruiterLayout>
  )
}

export default RecruiterOverview
