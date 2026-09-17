import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaHeartbeat, FaExclamationTriangle, FaClock, FaTimesCircle } from 'react-icons/fa'
import AdminLayout from './AdminLayout'
import PageTransition from '../extra/PageTransition'
import Loading from '../extra/Loading'
import { GetRecruiterDataHealth, ForceExpireJob } from '../../Services/operations/Admin'
import { utcDateToIstDisplay } from '../../utils/istTime'

// per direct request sir — this session's own debugging kept turning up the same two things by
// hand (SSH into EC2, write an ad-hoc Mongo query): a published job whose attached test is still
// a draft, and applications stuck at invited_to_test past their 5-hour window that
// TestInviteExpiryCron.js hasn't caught yet. Read-only, no writes — just surfaces what would
// otherwise need a manual DB query to spot.
const RecruiterDataHealth = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { recruiterDataHealth: health, loading } = useSelector((state) => state.admin)
  const [closingId, setClosingId] = useState(null)

  useEffect(() => {
    dispatch(GetRecruiterDataHealth(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleForceExpire = (jobId) => {
    dispatch(ForceExpireJob(jobId, token, (busy) => setClosingId(busy ? jobId : null)))
  }

  return (
    <AdminLayout title="Recruiter Data Health">
      <Helmet>
        <title>Admin — Recruiter Data Health | Resumify</title>
      </Helmet>

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
          <FaHeartbeat className="text-yellow-50" /> Recruiter data health
        </h2>

        {loading || !health ? (
          <Loading text="Checking recruiter data health..." />
        ) : (
          <>
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
              <h3 className="text-sm font-semibold text-richblack-5 mb-1 flex items-center gap-2">
                <FaExclamationTriangle className="text-warm-25" /> Published jobs with an unpublished test
              </h3>
              <p className="text-xs text-richblack-400 mb-4">
                Candidates can't be invited to these tests until the recruiter publishes them —
                the job itself is live, but "Invite to test" silently can't work.
              </p>
              {health.unpublishedTests.length === 0 ? (
                <p className="text-sm text-richblack-300">None right now.</p>
              ) : (
                <div className="space-y-2">
                  {health.unpublishedTests.map((row) => (
                    <div key={row.jobId} className="rounded-lg bg-richblack-700/40 p-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm text-richblack-5 font-medium truncate">{row.jobTitle}</p>
                        <p className="text-xs text-richblack-400 truncate">
                          {row.companyName}{row.recruiterEmail ? ` · ${row.recruiterEmail}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-richblack-400 font-mono">{row.jobId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
              <h3 className="text-sm font-semibold text-richblack-5 mb-1 flex items-center gap-2">
                <FaClock className="text-warm-25" /> Stale test invites (cron may have missed a run)
              </h3>
              <p className="text-xs text-richblack-400 mb-4">
                These applications are still 'invited_to_test' more than 30 minutes past their
                5-hour window — TestInviteExpiryCron.js should have already flipped them to
                'invite_expired'. Showing up here means the cron missed a run.
              </p>
              {health.staleInvites.length === 0 ? (
                <p className="text-sm text-richblack-300">None right now.</p>
              ) : (
                <div className="space-y-2">
                  {health.staleInvites.map((row) => (
                    <div key={row.applicationId} className="rounded-lg bg-richblack-700/40 p-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm text-richblack-5 font-medium truncate">{row.jobTitle}</p>
                        <p className="text-xs text-richblack-400 truncate">
                          {row.companyName ? `${row.companyName} · ` : ''}{row.candidateEmail}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-pink-100">
                        Expired {utcDateToIstDisplay(row.expiredAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
              <h3 className="text-sm font-semibold text-richblack-5 mb-1 flex items-center gap-2">
                <FaTimesCircle className="text-warm-25" /> Published jobs past their expiry (cron may have missed a run)
              </h3>
              <p className="text-xs text-richblack-400 mb-4">
                These jobs are still 'published' more than 30 minutes past their own expiresAt —
                JobExpiryCron.js should have already closed them. Force-close below as a manual
                override instead of waiting on the next run.
              </p>
              {health.overdueJobs.length === 0 ? (
                <p className="text-sm text-richblack-300">None right now.</p>
              ) : (
                <div className="space-y-2">
                  {health.overdueJobs.map((row) => (
                    <div key={row.jobId} className="rounded-lg bg-richblack-700/40 p-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm text-richblack-5 font-medium truncate">{row.jobTitle}</p>
                        <p className="text-xs text-richblack-400 truncate">
                          {row.companyName}{row.recruiterEmail ? ` · ${row.recruiterEmail}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-pink-100">
                          Expired {utcDateToIstDisplay(row.expiredAt)}
                        </span>
                        <button
                          onClick={() => handleForceExpire(row.jobId)}
                          disabled={closingId === row.jobId}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-700/20 text-pink-100 border border-pink-700 hover:bg-pink-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {closingId === row.jobId ? 'Closing...' : 'Force close'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </PageTransition>
    </AdminLayout>
  )
}

export default RecruiterDataHealth
