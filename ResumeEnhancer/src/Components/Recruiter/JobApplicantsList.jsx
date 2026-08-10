import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaExclamationTriangle, FaPaperPlane } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { GetJobApplicants, InviteApplicantToTest } from '../../Services/operations/Job'

const statusBadge = {
  applied: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  invited_to_test: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  completed_test: 'bg-blue-700/30 text-blue-100 border-blue-700',
  rejected: 'bg-pink-700/30 text-pink-100 border-pink-700',
  hired: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
}

const statusLabel = {
  applied: 'Applied',
  invited_to_test: 'Invited to test',
  completed_test: 'Test completed',
  rejected: 'Rejected',
  hired: 'Hired',
}

// replaces the old standalone AttemptsList sir — applicants are queried by JOB now, not by
// test. "Invite to test" is the gate that actually lets THAT candidate start the test (see
// controllers/Test.js's startAttempt); once they've completed it, the row links through to the
// existing AttemptDetail.jsx (unchanged) for the full violation/answers review.
const JobApplicantsList = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { jobApplicants, loading } = useSelector((state) => state.job)

  useEffect(() => {
    dispatch(GetJobApplicants(jobId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleInvite = (applicationId) => {
    dispatch(InviteApplicantToTest(applicationId, jobId, token))
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Applicants | Resumify Recruiter</title>
      </Helmet>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Applicants</h1>

      {loading ? (
        <Loading text="Loading applicants..." />
      ) : jobApplicants.length === 0 ? (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
          <p className="text-richblack-300 text-sm">No one has applied to this job yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobApplicants.map((app) => (
            <div key={app._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-richblack-5 font-semibold truncate">
                    {app.candidate ? `${app.candidate.firstName} ${app.candidate.lastName}` : 'Deleted candidate'}
                  </p>
                  <p className="text-xs text-richblack-400 truncate">{app.candidate?.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {app.testAttempt?.violationCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-25">
                      <FaExclamationTriangle /> {app.testAttempt.violationCount}
                    </span>
                  )}
                  {app.testAttempt?.score !== null && app.testAttempt?.score !== undefined && (
                    <span className="text-sm font-display text-yellow-50">{app.testAttempt.score} marks</span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[app.status]}`}>
                    {statusLabel[app.status] || app.status}
                  </span>
                  {app.status === 'applied' && (
                    <IconBtn
                      text="Invite to test"
                      onclick={() => handleInvite(app._id)}
                      customClasses="text-xs px-3 py-2"
                    >
                      <FaPaperPlane className="text-[10px]" />
                    </IconBtn>
                  )}
                  {app.testAttempt && ['invited_to_test', 'completed_test'].includes(app.status) && (
                    <Link
                      to={`/Recruiter/Attempts/${app.testAttempt._id}`}
                      className="px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                    >
                      View attempt
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RecruiterLayout>
  )
}

export default JobApplicantsList
