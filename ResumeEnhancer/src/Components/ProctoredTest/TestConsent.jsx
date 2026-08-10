import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaVideo, FaExclamationTriangle, FaClock } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { StartAttempt } from '../../Services/operations/Test'
import { setCameraConsent, resetTestAttempt } from '../../Slices/testAttemptSlice'

// the explicit consent step sir — nothing about the camera happens until the candidate reads
// this and clicks through. StartAttempt already ran (creates/resumes the attempt + fetches the
// sanitized question set), but the webcam itself only turns on once ProctoredTestRunner mounts,
// which only happens after this page navigates there.
const TestConsent = () => {
  const { inviteCode } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { test, attempt, loading } = useSelector((state) => state.testAttempt)

  useEffect(() => {
    dispatch(resetTestAttempt())
    dispatch(StartAttempt(inviteCode, token, navigate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode])

  const handleBegin = () => {
    dispatch(setCameraConsent(true))
    navigate(`/Test/${inviteCode}/run`)
  }

  if (loading || !test || !attempt) {
    return <Loading text="Loading the test..." />
  }

  return (
    <div className="min-h-screen bg-richblack-900 flex items-center justify-center px-4">
      <Helmet>
        <title>{test.title} | Resumify</title>
      </Helmet>
      <div className="w-full max-w-lg rounded-2xl bg-richblack-800 shadow-2xl shadow-richblack-900/40 p-8">
        <h1 className="font-display text-xl text-richblack-5 mb-2">{test.title}</h1>
        {test.description && <p className="text-sm text-richblack-300 mb-6">{test.description}</p>}

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <FaClock className="text-yellow-50 mt-1 shrink-0" />
            <p className="text-sm text-richblack-200">
              You will have a time limit for this test, scored out of {test.totalMarks} marks. It
              auto-submits when time runs out — plan accordingly.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <FaVideo className="text-yellow-50 mt-1 shrink-0" />
            <p className="text-sm text-richblack-200">
              This test uses your webcam to check that you're facing the screen. All face-tracking
              runs in your browser — your video is never sent anywhere. If you look away from the
              screen, a snapshot is captured and shared with the recruiter as a warning.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-pink-200 mt-1 shrink-0" />
            <p className="text-sm text-richblack-200">
              You'll get {test.maxViolations} warnings if you keep looking away. After that, the
              test ends automatically and your answers so far are submitted.
            </p>
          </div>
        </div>

        <p className="text-xs text-richblack-400 mb-6">
          By continuing, you agree to allow camera access for the duration of this test.
        </p>

        <IconBtn text="I understand, start the test" onclick={handleBegin} customClasses="w-full justify-center" />
      </div>
    </div>
  )
}

export default TestConsent
