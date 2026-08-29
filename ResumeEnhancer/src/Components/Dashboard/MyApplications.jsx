import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaBriefcase, FaMapMarkerAlt } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import { GetMyApplications } from '../../Services/operations/Job'

const statusBadge = {
  applied: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  invited_to_test: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  completed_test: 'bg-blue-700/30 text-blue-100 border-blue-700',
  invite_expired: 'bg-warm-700/30 text-warm-25 border-warm-600',
  rejected: 'bg-pink-700/30 text-pink-100 border-pink-700',
  hired: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
}

const statusLabel = {
  applied: 'Applied',
  invited_to_test: 'Invited to test',
  completed_test: 'Under review',
  invite_expired: 'Invite expired',
  rejected: 'Not selected',
  hired: 'Hired',
}

// candidate's own list of jobs they've applied to sir — deliberately named/routed distinctly
// from /Dashboard/Applications (the pre-existing personal Kanban tracker, Application.js), to
// avoid confusing this with real job-board applications (JobApplication.js)
const MyApplications = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { myApplications, loading } = useSelector((state) => state.job)

  useEffect(() => {
    dispatch(GetMyApplications(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DashboardLayout title="My Job Applications">
      <Helmet>
        <title>My Job Applications | Resumify</title>
      </Helmet>

      <div className="h-full overflow-y-auto thin-scrollbar px-6 py-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <Loading text="Loading your applications..." />
        ) : myApplications.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-100 mb-2 font-semibold">No applications yet</p>
            <p className="text-richblack-300 text-sm mb-6">Browse the job board and apply to roles that match your resume.</p>
            <Link to="/Jobs" className="inline-block px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200">
              Browse jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myApplications.map((app) => (
              <div key={app._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-richblack-5 font-semibold">{app.job?.title || 'Job no longer available'}</p>
                    <p className="text-sm text-warm-200">{app.job?.companyName}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-richblack-400 flex-wrap">
                      {app.job?.location && <span className="flex items-center gap-1.5"><FaMapMarkerAlt /> {app.job.location}</span>}
                      {app.job?.employmentType && <span className="flex items-center gap-1.5"><FaBriefcase /> {app.job.employmentType}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 text-[11px] font-bold uppercase rounded-full border ${statusBadge[app.status]}`}>
                    {statusLabel[app.status] || app.status}
                  </span>
                </div>
                {app.status === 'invited_to_test' && app.job?.status === 'published' && (
                  <p className="text-xs text-yellow-25 mt-3">
                    You've been invited to take this job's test — check your email or ask the recruiter for the test link.
                  </p>
                )}
                {/* per direct request sir — a candidate who finished the test had no explicit
                    signal that they're now just waiting, distinct from "applied" (nothing has
                    happened yet) or a final outcome (hired/rejected) */}
                {app.status === 'completed_test' && (
                  <p className="text-xs text-blue-100 mt-3">
                    You've completed this job's test. The recruiter is reviewing it — you'll get
                    the outcome by email once they decide.
                  </p>
                )}
                {app.status === 'invite_expired' && (
                  <p className="text-xs text-warm-25 mt-3">
                    Your test invite for this job expired before you started it. The recruiter can
                    still send you a new one if they choose to.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default MyApplications
