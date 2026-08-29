import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaVideo, FaExclamationTriangle, FaClock, FaTimesCircle, FaHourglassEnd } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { StartAttempt } from '../../Services/operations/Test'
import { setCameraConsent, resetTestAttempt } from '../../Slices/testAttemptSlice'

// one message per StartAttempt failure code sir (controllers/Test.js) — a candidate re-clicking
// an old email link after already finishing, or after the 5-hour invite window lapsed, are both
// real expected outcomes now, not just a generic toast + silent bounce to /Dashboard
const ERROR_SCREEN = {
  ALREADY_COMPLETED: {
    icon: FaTimesCircle,
    color: 'pink',
    title: 'Test already given',
    body: "You've already given this test — it can only be attempted once.",
  },
  INVITE_EXPIRED: {
    icon: FaHourglassEnd,
    color: 'pink',
    title: 'Test has expired',
    body: 'Better luck next time — this test invite is no longer valid.',
  },
  NOT_INVITED: {
    icon: FaTimesCircle,
    color: 'pink',
    title: 'Not invited to this test',
    body: "You need to be invited by the recruiter to take this test — apply to the job first.",
  },
  UNKNOWN: {
    icon: FaTimesCircle,
    color: 'pink',
    title: 'Could not start the test',
    body: 'Something went wrong. Please try again from your dashboard.',
  },
}

// the explicit consent step sir — nothing about the camera happens until the candidate reads
// this and clicks through. StartAttempt already ran (creates/resumes the attempt + fetches the
// sanitized question set), but the webcam itself only turns on once ProctoredTestRunner mounts,
// which only happens after this page navigates there.
const TestConsent = () => {
  const { inviteCode } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { test, attempt, loading, attemptError } = useSelector((state) => state.testAttempt)

  useEffect(() => {
    dispatch(resetTestAttempt())
    dispatch(StartAttempt(inviteCode, token, navigate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode])

  const handleBegin = () => {
    dispatch(setCameraConsent(true))
    navigate(`/Test/${inviteCode}/run`)
  }

  // dedicated full-screen outcome sir — an old email link re-clicked after already finishing, or
  // after the 5-hour invite window lapsed, are real expected states now, not a generic toast +
  // silent bounce to /Dashboard. Centered, animated, red for all three (all are "you can't take
  // this test" outcomes), per direct request.
  if (attemptError) {
    const screen = ERROR_SCREEN[attemptError.code] || ERROR_SCREEN.UNKNOWN
    const Icon = screen.icon
    return (
      <div className="min-h-screen bg-richblack-900 flex items-center justify-center px-4">
        <Helmet>
          <title>{screen.title} | Resumify</title>
        </Helmet>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl p-8 flex flex-col items-center gap-4 text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-pink-700/30 border-2 border-pink-700 flex items-center justify-center"
          >
            <Icon className="text-pink-100 text-3xl" />
          </motion.div>

          <p className="text-xl font-bold text-richblack-5">{screen.title}</p>
          <p className="text-sm text-richblack-200 leading-relaxed">{screen.body}</p>

          <IconBtn text="Back to Dashboard" onclick={() => navigate('/Dashboard')} customClasses="w-full justify-center mt-2" />
        </motion.div>
      </div>
    )
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
