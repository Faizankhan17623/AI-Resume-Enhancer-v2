import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaHeartbeat, FaExclamationTriangle, FaClock } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import Loading from '../extra/Loading'
import { GetRecruiterDataHealth } from '../../Services/operations/Admin'
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

  useEffect(() => {
    dispatch(GetRecruiterDataHealth(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Recruiter Data Health | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

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
          </>
        )}
      </PageTransition>
    </div>
  )
}

export default RecruiterDataHealth
