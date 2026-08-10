import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaExclamationTriangle } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import Loading from '../extra/Loading'
import { GetAttemptDetail } from '../../Services/operations/Test'
import { utcDateToIstDisplay } from '../../utils/istTime'

const statusLabel = {
  'in-progress': 'In progress',
  completed: 'Completed',
  terminated_violations: 'Ended — too many warnings',
  terminated_timeout: 'Ended — time ran out',
}

const AttemptDetail = () => {
  const { attemptId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { currentAttemptDetail: attempt, loading } = useSelector((state) => state.test)

  useEffect(() => {
    dispatch(GetAttemptDetail(attemptId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  if (loading || !attempt) {
    return (
      <RecruiterLayout>
        <Loading text="Loading attempt..." />
      </RecruiterLayout>
    )
  }

  const answersByQuestionId = new Map((attempt.answers || []).map((a) => [String(a.questionId), a.answer]))

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Attempt Detail | Resumify Recruiter</title>
      </Helmet>

      <div className="max-w-3xl space-y-6">
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h1 className="font-display text-xl text-richblack-5 mb-1">
            {attempt.candidate ? `${attempt.candidate.firstName} ${attempt.candidate.lastName}` : 'Deleted candidate'}
          </h1>
          <p className="text-sm text-richblack-300 mb-4">{attempt.candidate?.email}</p>
          <div className="flex items-center gap-4 text-sm text-richblack-200 flex-wrap">
            <span>Status: <span className="font-semibold text-richblack-5">{statusLabel[attempt.status] || attempt.status}</span></span>
            {attempt.score !== null && attempt.score !== undefined && (
              <span>Score: <span className="font-semibold text-yellow-50">{attempt.score}{attempt.test?.totalMarks ? ` / ${attempt.test.totalMarks} marks` : ' marks'}</span></span>
            )}
            <span>Violations: <span className="font-semibold text-richblack-5">{attempt.violationCount}</span></span>
          </div>
        </div>

        {attempt.violations?.length > 0 && (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <h2 className="text-sm font-semibold text-richblack-5 mb-4 flex items-center gap-2">
              <FaExclamationTriangle className="text-yellow-25" /> Violation Timeline
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {attempt.violations.map((v, i) => (
                <div key={v._id || i} className="rounded-lg overflow-hidden border border-richblack-600">
                  {v.snapshotUrl ? (
                    <img src={v.snapshotUrl} alt={`Violation ${i + 1}`} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-richblack-700 flex items-center justify-center text-xs text-richblack-400">No image</div>
                  )}
                  <div className="p-2 bg-richblack-900/60">
                    <p className="text-[11px] text-richblack-300">#{i + 1} · Looked away</p>
                    <p className="text-[10px] text-richblack-400">{utcDateToIstDisplay(v.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {attempt.test?.questions?.length > 0 && (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-richblack-5">Answers</h2>
            {attempt.test.questions.map((q, i) => (
              <div key={q._id || i} className="border-t border-richblack-700 pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm text-richblack-5 mb-2">{i + 1}. {q.prompt} <span className="text-xs text-richblack-400">({q.marks} marks)</span></p>
                <p className="text-sm text-richblack-200 whitespace-pre-wrap">
                  {answersByQuestionId.get(String(q._id)) || <span className="text-richblack-400 italic">No answer given</span>}
                </p>
                {q.type === 'mcq' && q.correctAnswer && (
                  <p className="text-xs text-richblack-400 mt-1">Correct answer: {q.correctAnswer}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </RecruiterLayout>
  )
}

export default AttemptDetail
