import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaExclamationTriangle } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import Loading from '../extra/Loading'
import { GetTestAttempts } from '../../Services/operations/Test'

const statusBadge = {
  'in-progress': 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  completed: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  terminated_violations: 'bg-pink-700/30 text-pink-100 border-pink-700',
  terminated_timeout: 'bg-richblack-700 text-richblack-200 border-richblack-600',
}

const statusLabel = {
  'in-progress': 'In progress',
  completed: 'Completed',
  terminated_violations: 'Ended — too many warnings',
  terminated_timeout: 'Ended — time ran out',
}

const AttemptsList = () => {
  const { testId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { testAttempts, loading } = useSelector((state) => state.test)

  useEffect(() => {
    dispatch(GetTestAttempts(testId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Attempts | Resumify Recruiter</title>
      </Helmet>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Attempts</h1>

      {loading ? (
        <Loading text="Loading attempts..." />
      ) : testAttempts.length === 0 ? (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
          <p className="text-richblack-300 text-sm">No candidates have started this test yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {testAttempts.map((attempt) => (
            <Link
              key={attempt._id}
              to={`/Recruiter/Attempts/${attempt._id}`}
              className="block rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5 hover:bg-richblack-700/60 transition-colors duration-200"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-richblack-5 font-semibold truncate">
                    {attempt.candidate ? `${attempt.candidate.firstName} ${attempt.candidate.lastName}` : 'Deleted candidate'}
                  </p>
                  <p className="text-xs text-richblack-400 truncate">{attempt.candidate?.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {attempt.violationCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-25">
                      <FaExclamationTriangle /> {attempt.violationCount}
                    </span>
                  )}
                  {attempt.score !== null && attempt.score !== undefined && (
                    <span className="text-sm font-display text-yellow-50">{attempt.score}%</span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[attempt.status]}`}>
                    {statusLabel[attempt.status] || attempt.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </RecruiterLayout>
  )
}

export default AttemptsList
