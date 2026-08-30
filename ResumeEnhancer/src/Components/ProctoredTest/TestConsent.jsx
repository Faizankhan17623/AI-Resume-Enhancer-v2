import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaVideo, FaExclamationTriangle, FaClock, FaTimesCircle, FaHourglassEnd, FaWifi, FaCheckCircle } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { PreviewTest, StartAttempt } from '../../Services/operations/Test'
import { setCameraConsent, resetTestAttempt } from '../../Slices/testAttemptSlice'
import { measureDownloadMbps, MIN_REQUIRED_MBPS } from '../../utils/speedTest'

// one message per StartAttempt failure code sir (controllers/Test.js) — a candidate re-clicking
// an old email link after already finishing, or after the 5-hour invite window lapsed, are both
// real expected outcomes now, not just a generic toast + silent bounce to /Dashboard
const ERROR_SCREEN = {
  ALREADY_COMPLETED: {
    icon: FaTimesCircle,
    title: 'Test already given',
    body: "You've already given this test — it can only be attempted once.",
  },
  INVITE_EXPIRED: {
    icon: FaHourglassEnd,
    title: 'Test has expired',
    body: 'Better luck next time — this test invite is no longer valid.',
  },
  NOT_INVITED: {
    icon: FaTimesCircle,
    title: 'Not invited to this test',
    body: "You need to be invited by the recruiter to take this test — apply to the job first.",
  },
  UNKNOWN: {
    icon: FaTimesCircle,
    title: 'Could not start the test',
    body: 'Something went wrong. Please try again from your dashboard.',
  },
}

// 'rules' -> 'camera' -> 'speed' -> (StartAttempt fires, clock starts) -> navigate to /run sir.
// Per direct request: camera + speed checks happen BEFORE the exam clock starts, so neither one
// eats into the candidate's actual answering time — today's flow used to call StartAttempt (which
// sets endsAt) the moment "I understand, start the test" was clicked, before any of this existed.
const STEP = { RULES: 'rules', CAMERA: 'camera', SPEED: 'speed' }

const TestConsent = () => {
  const { inviteCode } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { test, loading, attemptError } = useSelector((state) => state.testAttempt)

  const [step, setStep] = useState(STEP.RULES)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [speedStatus, setSpeedStatus] = useState('checking') // 'checking' | 'ok' | 'slow' | 'failed'
  const [measuredMbps, setMeasuredMbps] = useState(null)
  const [startingTest, setStartingTest] = useState(false)
  // bumped on "Check again" sir — setStep(STEP.SPEED) while ALREADY on STEP.SPEED is a no-op
  // (React bails out of re-rendering on an unchanged state value), so the effect below needs its
  // own always-changing dependency to actually re-run the measurement
  const [speedCheckAttempt, setSpeedCheckAttempt] = useState(0)
  // same reasoning as speedCheckAttempt above sir, for the camera step's own "Try again"
  const [cameraCheckAttempt, setCameraCheckAttempt] = useState(0)

  // both checks passed sir — THIS is when the clock actually starts (StartAttempt sets endsAt).
  // Hoisted above the mount effect below (it used to sit further down, after its first use) —
  // referencing a function before its declaration works at runtime here since the effect's .then()
  // callback only ever fires after the whole component body has finished running, but the lint
  // rule doesn't know that and flags the ordering. No dependency cycle: everything this closes
  // over is declared above it already.
  const handleAllChecksPassed = async () => {
    setStartingTest(true)
    await dispatch(StartAttempt(inviteCode, token, null))
    dispatch(setCameraConsent(true))
    navigate(`/Test/${inviteCode}/run`)
  }

  // PreviewTest (read-only, no clock) replaces StartAttempt on mount sir — catches
  // NOT_INVITED/ALREADY_COMPLETED/INVITE_EXPIRED and loads the test's title/rules up front without
  // creating an attempt. `resuming: true` means a mid-test refresh (an attempt is already
  // in-progress) — skip straight past the camera/speed checks in that case, they already happened
  // once for this attempt and re-running them would eat further into a clock that's already ticking.
  useEffect(() => {
    dispatch(resetTestAttempt())
    dispatch(PreviewTest(inviteCode, token)).then((result) => {
      if (result?.resuming) handleAllChecksPassed()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode])

  // camera preview sir — a real getUserMedia call so the candidate actually sees their own face
  // before the clock starts, per direct request. Stopped again once they continue past this step;
  // ProctoredTestRunner re-acquires its own stream once the real test starts (permission is
  // already granted by then, so that second call is effectively instant, no new prompt).
  // Keyed on cameraCheckAttempt too, same reasoning as the speed check's own retry counter below.
  useEffect(() => {
    if (step !== STEP.CAMERA) return
    let cancelled = false
    // deliberate: reset to a clean "checking" state before the async getUserMedia call starts, so
    // the UI doesn't flash a stale error/ready state from a previous attempt while this one is in
    // flight — removing this would be a real behavior regression, not just a lint fix
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCameraError(null)
    setCameraReady(false)

    navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        setCameraError(
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Camera access was denied. Please allow camera access and try again.'
            : 'Could not start the camera. Please check your webcam and try again.'
        )
      })

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [step, cameraCheckAttempt])

  // speed check sir — runs once on entering this step, and again each time speedCheckAttempt
  // is bumped by "Check again"
  useEffect(() => {
    if (step !== STEP.SPEED) return
    let cancelled = false
    // deliberate reset before the async measurement starts sir, same reasoning as the camera
    // effect above
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeedStatus('checking')

    measureDownloadMbps().then((mbps) => {
      if (cancelled) return
      if (mbps === null) {
        setSpeedStatus('failed')
      } else {
        setMeasuredMbps(mbps)
        setSpeedStatus(mbps >= MIN_REQUIRED_MBPS ? 'ok' : 'slow')
      }
    })

    return () => { cancelled = true }
  }, [step, speedCheckAttempt])

  const handleBeginChecks = () => setStep(STEP.CAMERA)

  const handleCameraContinue = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setStep(STEP.SPEED)
  }

  const retrySpeedCheck = () => setSpeedCheckAttempt((n) => n + 1)

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

  if (startingTest || loading || !test) {
    return <Loading text={startingTest ? 'Starting your test...' : 'Loading the test...'} />
  }

  // step 2 sir — camera preview, candidate sees their own face before continuing
  if (step === STEP.CAMERA) {
    return (
      <div className="min-h-screen bg-richblack-900 flex items-center justify-center px-4">
        <Helmet>
          <title>Camera Check | Resumify</title>
        </Helmet>
        <div className="w-full max-w-lg rounded-2xl bg-richblack-800 shadow-2xl shadow-richblack-900/40 p-8 text-center">
          <h1 className="font-display text-xl text-richblack-5 mb-2">Check your camera</h1>
          <p className="text-sm text-richblack-300 mb-6">
            Make sure your face is clearly visible before continuing.
          </p>

          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] mb-6 mx-auto max-w-sm">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-richblack-900/80">
                <p className="text-xs text-richblack-200">Starting camera...</p>
              </div>
            )}
          </div>

          {cameraError ? (
            <div className="mb-6">
              <p className="text-sm text-pink-100 mb-4 flex items-center justify-center gap-2">
                <FaExclamationTriangle /> {cameraError}
              </p>
              <IconBtn text="Try again" onclick={() => setCameraCheckAttempt((n) => n + 1)} customClasses="w-full justify-center" />
            </div>
          ) : (
            <IconBtn
              text="My camera looks good, continue"
              onclick={handleCameraContinue}
              disabled={!cameraReady}
              customClasses="w-full justify-center"
            />
          )}
        </div>
      </div>
    )
  }

  // step 3 sir — internet speed check, minimum MIN_REQUIRED_MBPS to proceed
  if (step === STEP.SPEED) {
    return (
      <div className="min-h-screen bg-richblack-900 flex items-center justify-center px-4">
        <Helmet>
          <title>Connection Check | Resumify</title>
        </Helmet>
        <div className="w-full max-w-lg rounded-2xl bg-richblack-800 shadow-2xl shadow-richblack-900/40 p-8 text-center">
          <h1 className="font-display text-xl text-richblack-5 mb-2">Checking your internet speed</h1>
          <p className="text-sm text-richblack-300 mb-6">
            This test needs a stable connection of at least {MIN_REQUIRED_MBPS} Mbps.
          </p>

          <div className="rounded-xl bg-richblack-900/60 border border-richblack-700 p-6 mb-6 flex flex-col items-center gap-3">
            {speedStatus === 'checking' && (
              <>
                <FaWifi className="text-3xl text-yellow-50 animate-pulse" />
                <p className="text-sm text-richblack-200">Measuring your connection...</p>
              </>
            )}
            {speedStatus === 'ok' && (
              <>
                <FaCheckCircle className="text-3xl text-caribgreen-25" />
                <p className="text-sm text-richblack-100">
                  Looks good — about {measuredMbps.toFixed(1)} Mbps.
                </p>
              </>
            )}
            {speedStatus === 'slow' && (
              <>
                <FaExclamationTriangle className="text-3xl text-pink-100" />
                <p className="text-sm text-pink-100">
                  Your connection is about {measuredMbps.toFixed(1)} Mbps, below the {MIN_REQUIRED_MBPS} Mbps
                  needed for this test.
                </p>
                <p className="text-xs text-richblack-300">
                  Please move somewhere with a faster, more stable connection (or switch networks)
                  and take the test later, before your invite expires.
                </p>
              </>
            )}
            {speedStatus === 'failed' && (
              <>
                <FaExclamationTriangle className="text-3xl text-pink-100" />
                <p className="text-sm text-pink-100">Could not measure your connection speed.</p>
              </>
            )}
          </div>

          {speedStatus === 'ok' ? (
            <IconBtn text="Start the test" onclick={handleAllChecksPassed} customClasses="w-full justify-center" />
          ) : (speedStatus === 'slow' || speedStatus === 'failed') ? (
            <IconBtn text="Check again" onclick={retrySpeedCheck} customClasses="w-full justify-center" />
          ) : null}
        </div>
      </div>
    )
  }

  // step 1 sir — the rules screen, unchanged copy from before
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
              auto-submits when time runs out — plan accordingly. The clock starts once you've
              passed the camera and connection checks on the next screens, not before.
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

        <IconBtn text="I understand, continue" onclick={handleBeginChecks} customClasses="w-full justify-center" />
      </div>
    </div>
  )
}

export default TestConsent
