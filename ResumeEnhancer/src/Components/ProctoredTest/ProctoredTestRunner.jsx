import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { FaExclamationTriangle, FaClock } from 'react-icons/fa'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { LogViolation, SubmitTestAnswers } from '../../Services/operations/Test'
import { setAnswer, resetTestAttempt } from '../../Slices/testAttemptSlice'
import { estimateYawRatio, YAW_AWAY_THRESHOLD } from '../../utils/facePose'

// how long the candidate has to be turned away before it counts as ONE violation sir — a quick
// glance shouldn't trip it, only a sustained turn
const LOOK_AWAY_GRACE_MS = 3000
// how often a detection pass runs sir — frequent enough to feel responsive, cheap enough
// to not tax a low-end laptop's CPU/GPU running this alongside everything else
const DETECTION_INTERVAL_MS = 700
// minimum gap between two violation reports sir, independent of the grace period above — once a
// violation fires, this stops an immediate second one from double-counting the SAME "still
// looking away" state before the candidate has had a chance to correct
const VIOLATION_COOLDOWN_MS = 4000

const ProctoredTestRunner = () => {
    const { inviteCode } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const { test, attempt, answers, cameraConsent } = useSelector((state) => state.testAttempt)

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const detectorRef = useRef(null)
    const streamRef = useRef(null)
    const detectionTimerRef = useRef(null)
    const lookAwaySinceRef = useRef(null)
    const lastViolationAtRef = useRef(0)
    const endedRef = useRef(false)

    const [modelReady, setModelReady] = useState(false)
    const [cameraError, setCameraError] = useState(null)
    const [warningCount, setWarningCount] = useState(0)
    const [secondsLeft, setSecondsLeft] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    // consent must have happened on the previous screen sir — a direct link to /run without it
    // (bookmark, back button after declining) bounces to the consent screen instead of ever
    // touching getUserMedia
    useEffect(() => {
        if (!cameraConsent || !attempt) {
            navigate(`/Test/${inviteCode}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const endTest = useCallback(async (reason) => {
        if (endedRef.current) return
        endedRef.current = true
        clearInterval(detectionTimerRef.current)

        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())

        if (reason === 'violations') {
            await Swal.fire({
                title: 'Test ended',
                text: 'You received too many warnings for looking away from the screen. Your answers so far have been submitted.',
                icon: 'error',
                confirmButtonText: 'OK',
                background: '#1F1C16',
                color: '#F3EFE6',
                confirmButtonColor: '#C1443C',
            })
        }

        await dispatch(SubmitTestAnswers(attempt._id, answers, token, null, setSubmitting))
        dispatch(resetTestAttempt())
        navigate('/Dashboard')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt, answers, token])

    // server-anchored countdown sir — endsAt came from the backend when the attempt started, so
    // a page refresh or a tampered local clock can't extend it. The backend independently
    // re-checks the deadline on submit regardless, this is purely the candidate-facing display.
    useEffect(() => {
        if (!attempt?.endsAt) return
        const tick = () => {
            const remaining = Math.max(0, Math.floor((new Date(attempt.endsAt).getTime() - Date.now()) / 1000))
            setSecondsLeft(remaining)
            if (remaining <= 0) endTest('timeout')
        }
        tick()
        const timer = setInterval(tick, 1000)
        return () => clearInterval(timer)
    }, [attempt?.endsAt, endTest])

    // load the model + start the camera once sir
    useEffect(() => {
        if (!attempt) return
        let cancelled = false

        const setup = async () => {
            try {
                // camera + ML model load IN PARALLEL sir — these used to run serially (backend
                // init -> model download -> only THEN getUserMedia), which meant the browser's
                // permission prompt and camera light didn't appear until the face-mesh model had
                // fully downloaded and initialized. On a slow connection or an uncached first
                // load that's several extra seconds of the candidate staring at a blank screen
                // with no camera activity at all, before it suddenly turns on — reads exactly
                // like "it's taking forever" / "is something wrong". Kicking both off at once
                // means the camera prompt shows up immediately; the detection loop below already
                // waits on `modelReady` regardless of which finishes first.
                const modelPromise = (async () => {
                    await tf.setBackend('webgl')
                    await tf.ready()
                    return faceLandmarksDetection.createDetector(
                        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                        { runtime: 'tfjs', refineLandmarks: false, maxFaces: 1 }
                    )
                })()

                const streamPromise = navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false })

                const [detector, stream] = await Promise.all([modelPromise, streamPromise])
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }
                detectorRef.current = detector
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play()
                }

                setModelReady(true)
            } catch (err) {
                if (cancelled) return
                // getUserMedia denial, no webcam, or model load failure all land here sir — the
                // candidate can't be proctored, so they can't take the test, rather than silently
                // letting an unproctored attempt through
                setCameraError(
                    err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
                        ? 'Camera access was denied. Please allow camera access and reload this page to take the test.'
                        : 'Could not start the camera. Please check your webcam and reload this page.'
                )
            }
        }

        setup()
        return () => {
            cancelled = true
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
        }
    }, [attempt])

    const reportViolation = useCallback(async () => {
        const now = Date.now()
        if (now - lastViolationAtRef.current < VIOLATION_COOLDOWN_MS) return
        lastViolationAtRef.current = now

        const canvas = canvasRef.current
        if (!canvas) return

        canvas.toBlob(async (blob) => {
            if (!blob || endedRef.current) return
            const result = await dispatch(LogViolation(attempt._id, blob, token))
            if (!result) return

            setWarningCount(result.violationCount)
            if (result.terminated) {
                endTest('violations')
                return
            }
            toast(`Warning ${result.violationCount}/${test.maxViolations} — please face the camera`, { icon: '⚠️' })
        }, 'image/jpeg', 0.8)
    }, [attempt, token, test, dispatch, endTest])

    // the detection loop sir — draws the video frame + landmark dots onto the visible canvas
    // (so the candidate sees their REAL face being tracked, not an abstract render), and checks
    // yaw against the threshold to decide if a sustained look-away should fire a violation
    useEffect(() => {
        if (!modelReady) return

        detectionTimerRef.current = setInterval(async () => {
            const video = videoRef.current
            const canvas = canvasRef.current
            const detector = detectorRef.current
            if (!video || !canvas || !detector || video.readyState < 2) return

            const ctx = canvas.getContext('2d')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            const faces = await detector.estimateFaces(video, { flipHorizontal: false })

            if (!faces.length) {
                // no face in frame at all sir — treated the same as looking away
                if (!lookAwaySinceRef.current) lookAwaySinceRef.current = Date.now()
            } else {
                const face = faces[0]
                ctx.fillStyle = '#FFD60A'
                for (const kp of face.keypoints) {
                    ctx.beginPath()
                    ctx.arc(kp.x, kp.y, 1.2, 0, 2 * Math.PI)
                    ctx.fill()
                }

                const yaw = estimateYawRatio(face.keypoints)
                const isAway = yaw === null || Math.abs(yaw) > YAW_AWAY_THRESHOLD

                if (isAway) {
                    if (!lookAwaySinceRef.current) lookAwaySinceRef.current = Date.now()
                } else {
                    lookAwaySinceRef.current = null
                }
            }

            if (lookAwaySinceRef.current && Date.now() - lookAwaySinceRef.current >= LOOK_AWAY_GRACE_MS) {
                reportViolation()
                lookAwaySinceRef.current = null // grace period restarts sir, cooldown still applies inside reportViolation
            }
        }, DETECTION_INTERVAL_MS)

        return () => clearInterval(detectionTimerRef.current)
    }, [modelReady, reportViolation])

    const handleAnswerChange = (questionId, value) => {
        dispatch(setAnswer({ questionId, answer: value }))
    }

    const handleSubmit = async () => {
        await endTest('manual')
    }

    if (cameraError) {
        return (
            <div className="min-h-screen bg-richblack-900 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <FaExclamationTriangle className="text-3xl text-pink-200 mx-auto mb-4" />
                    <p className="text-richblack-5 font-semibold mb-2">Camera required</p>
                    <p className="text-sm text-richblack-300">{cameraError}</p>
                </div>
            </div>
        )
    }

    if (!attempt || !test) {
        return <Loading text="Loading..." />
    }

    const minutes = secondsLeft === null ? '--' : String(Math.floor(secondsLeft / 60)).padStart(2, '0')
    const seconds = secondsLeft === null ? '--' : String(secondsLeft % 60).padStart(2, '0')

    return (
        <div className="min-h-screen bg-richblack-900 px-4 py-6">
            <Helmet>
                <title>{test.title} | Resumify</title>
            </Helmet>

            <AnimatePresence>
            {submitting && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
                >
                    <Loading text="Submitting..." size="compact" />
                </motion.div>
            )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* camera panel sir — real video underneath, landmark dots drawn on the canvas
                    directly on top of it, so the candidate sees themself being tracked */}
                <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                        <video ref={videoRef} className="w-full h-full object-cover opacity-0 absolute inset-0" playsInline muted />
                        <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        {!modelReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-richblack-900/80">
                                <p className="text-xs text-richblack-200">Starting camera...</p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl bg-richblack-800 p-4 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-richblack-200">
                            <FaClock className="text-yellow-50" /> Time left
                        </span>
                        <span className="font-display text-lg text-richblack-5">{minutes}:{seconds}</span>
                    </div>

                    <div className="rounded-xl bg-richblack-800 p-4">
                        <p className="text-xs text-richblack-300 flex items-center gap-2">
                            <FaExclamationTriangle className="text-yellow-25 shrink-0" />
                            Warnings: <span className="font-semibold text-richblack-5">{warningCount}/{test.maxViolations}</span>
                        </p>
                    </div>
                </div>

                {/* questions sir */}
                <div className="space-y-4">
                    {test.questions.map((q, i) => (
                        <div key={q._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
                            <p className="text-sm text-richblack-5 mb-4">
                                {i + 1}. {q.prompt} <span className="text-xs text-richblack-400">({q.marks} marks)</span>
                            </p>
                            {q.type === 'mcq' ? (
                                <div className="space-y-2">
                                    {q.options.map((opt) => (
                                        <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={q._id}
                                                checked={answers[q._id] === opt}
                                                onChange={() => handleAnswerChange(q._id, opt)}
                                                className="accent-yellow-50"
                                            />
                                            <span className="text-sm text-richblack-200">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    value={answers[q._id] || ''}
                                    onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                                    rows={4}
                                    className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
                                />
                            )}
                        </div>
                    ))}

                    <IconBtn
                        text="Submit test"
                        onclick={handleSubmit}
                        disabled={submitting}
                        customClasses="w-full justify-center"
                    />
                </div>
            </div>
        </div>
    )
}

export default ProctoredTestRunner
