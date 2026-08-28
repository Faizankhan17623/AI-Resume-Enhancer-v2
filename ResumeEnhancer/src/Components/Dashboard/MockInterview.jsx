import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'motion/react'
import { FaPlus, FaTrash, FaFilePdf, FaTimes, FaComments, FaCrown, FaCheckCircle, FaLightbulb } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { GetAllMockInterviews, GetSingleMockInterview, StartMockInterview, AnswerMockInterview, DeleteMockInterview } from '../../Services/operations/MockInterview'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// ---------- the new-session modal sir — resume PDF + JD, costs one credit ----------
const NewSessionModal = ({ onClose }) => {
  const [pdfFile, setPdfFile] = useState(null)
  const [jd, setJd] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { loading } = useSelector((state) => state.mockInterview)

  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The file must be under 5 MB")
      return
    }
    setPdfFile(file)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!pdfFile) return toast.error("Please upload your resume PDF")
    if (!jd.trim()) return toast.error("Please paste the job description")
    await dispatch(StartMockInterview(pdfFile, jd.trim(), token, navigate))
    onClose()
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={modalBackdrop}
      className="fixed inset-0 z-50 bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <motion.div variants={modalPanel} className="w-full max-w-lg rounded-2xl bg-richblack-800 shadow-2xl shadow-richblack-900/40 p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-richblack-5">New Mock Interview</h2>
          <button onClick={onClose} className="text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {pdfFile ? (
            <div className="flex items-center justify-between rounded-lg bg-richblack-900/60 border border-caribgreen-300 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FaFilePdf className="text-pink-200 shrink-0" />
                <p className="text-sm text-richblack-5 truncate">{pdfFile.name}</p>
              </div>
              <button type="button" onClick={() => setPdfFile(null)} className="text-richblack-300 hover:text-pink-200 cursor-pointer">
                <FaTimes className="text-sm" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-richblack-600 bg-yellow-900/5 p-6 cursor-pointer hover:border-richblack-400 transition-colors duration-200">
              <FaFilePdf className="text-2xl text-yellow-50" />
              <p className="text-xs text-richblack-200">Click to upload your resume PDF</p>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          )}

          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here..."
            rows={5}
            className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
          />

          <IconBtn type="submit" text={loading ? "Preparing..." : "Start the interview"} disabled={loading} customClasses="w-full justify-center" />
        </form>
      </motion.div>
    </motion.div>
  )
}

const difficultyBadge = {
  easy: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  medium: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  hard: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

// ---------- one Q&A turn sir — question, then an answer box, then the reveal ----------
const TurnCard = ({ turn, isCurrent, onSubmitAnswer, scoring }) => {
  const [answer, setAnswer] = useState('')
  const isAnswered = !!turn.answer

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-richblack-5 flex items-start gap-2">
          <FaComments className="text-blue-100 shrink-0 mt-0.5" /> {turn.question}
        </p>
        {turn.difficulty && (
          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${difficultyBadge[turn.difficulty] || difficultyBadge.medium}`}>
            {turn.difficulty}
          </span>
        )}
      </div>
      {turn.category && <p className="text-xs text-richblack-400 mb-4">{turn.category}</p>}

      {!isAnswered ? (
        isCurrent && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!answer.trim() || scoring) return
              onSubmitAnswer(answer.trim())
            }}
            className="space-y-3"
          >
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer as you would say it out loud..."
              rows={4}
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
              disabled={scoring}
            />
            <IconBtn type="submit" text={scoring ? "Scoring..." : "Submit answer"} disabled={scoring || !answer.trim()} customClasses="w-full justify-center" />
          </form>
        )
      ) : (
        <div className="space-y-3 border-t border-richblack-700 pt-4">
          <p className="text-sm text-richblack-200 whitespace-pre-wrap">{turn.answer}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-display text-yellow-50">{turn.score}/10</span>
            <span className="text-xs text-richblack-400">score</span>
          </div>
          {turn.feedback && (
            <div className="rounded-lg bg-richblack-700/60 p-4">
              <p className="text-xs font-semibold text-richblack-100 mb-1 flex items-center gap-1.5"><FaLightbulb className="text-yellow-50" /> Feedback</p>
              <p className="text-xs text-richblack-200">{turn.feedback}</p>
            </div>
          )}
          {turn.sampleAnswer && (
            <div className="rounded-lg bg-richblack-700/60 p-4">
              <p className="text-xs font-semibold text-richblack-100 mb-1 flex items-center gap-1.5"><FaCheckCircle className="text-caribgreen-100" /> A stronger answer</p>
              <p className="text-xs text-richblack-200 whitespace-pre-wrap">{turn.sampleAnswer}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

const LIST_MIN = 240
const LIST_MAX = 420
const LIST_DEFAULT = 288 // matches the old fixed w-72
const LIST_STORAGE_KEY = 'resumify:mockInterviewListWidth'

const MockInterview = () => {
  const { sessionId } = useParams()
  const [showModal, setShowModal] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token, user } = useSelector((state) => state.auth)
  const { allSessions, currentSession, loading, scoring } = useSelector((state) => state.mockInterview)
  const [deleting, setDeleting] = useState(false)

  const isProMax = user?.SubType === 'ProMax'

  // session-list pane width sir — drag the right edge to resize, same pattern as the main
  // dashboard sidebar in DashboardLayout.jsx (own localStorage key, this is a distinct pane)
  const [listWidth, setListWidth] = useState(() => {
    const stored = Number(localStorage.getItem(LIST_STORAGE_KEY))
    return stored >= LIST_MIN && stored <= LIST_MAX ? stored : LIST_DEFAULT
  })
  const [resizing, setResizing] = useState(false)
  const resizeStateRef = useRef({ startX: 0, startWidth: LIST_DEFAULT })

  const handleResizeStart = useCallback((e) => {
    resizeStateRef.current = { startX: e.clientX, startWidth: listWidth }
    setResizing(true)
  }, [listWidth])

  useEffect(() => {
    if (!resizing) return
    const handleMouseMove = (e) => {
      const { startX, startWidth } = resizeStateRef.current
      const next = Math.min(LIST_MAX, Math.max(LIST_MIN, startWidth + (e.clientX - startX)))
      setListWidth(next)
    }
    const handleMouseUp = () => setResizing(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  useEffect(() => {
    if (!resizing) localStorage.setItem(LIST_STORAGE_KEY, String(listWidth))
  }, [resizing, listWidth])

  useEffect(() => {
    if (isProMax) dispatch(GetAllMockInterviews(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (sessionId) dispatch(GetSingleMockInterview(sessionId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleSubmitAnswer = (answer) => {
    dispatch(AnswerMockInterview(sessionId, answer, token, currentSession))
  }

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete this session?',
      text: 'All its questions and scores will be gone forever',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C1443C',
      cancelButtonColor: '#3A3428',
      confirmButtonText: 'Yes, delete it',
      background: '#1F1C16',
      color: '#F3EFE6'
    }).then((result) => {
      if (result.isConfirmed) {
        // only clear the open session + navigate away if THIS is the session that's currently
        // open sir — deleting a different one from the sidebar shouldn't kick the user out of
        // the session they're viewing
        const isOpenSession = id === sessionId
        dispatch(DeleteMockInterview(id, token, isOpenSession ? navigate : null, setDeleting))
      }
    })
  }

  if (!isProMax) {
    return (
      <DashboardLayout title="Mock Interview">
        <Helmet>
          <title>Mock Interview | Resumify</title>
        </Helmet>
        <div className="h-full max-w-2xl mx-auto px-4 py-16">
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
            <FaCrown className="text-3xl text-yellow-50 mx-auto mb-4" />
            <p className="text-richblack-100 mb-2 font-semibold">Mock interviews are a Pro Max feature</p>
            <p className="text-richblack-300 text-sm mb-6">Upgrade to Pro Max for scored, structured mock interviews tailored to your resume and target job.</p>
            <Link to="/Pricing" state={{ reason: 'mockInterview' }} className="inline-block">
              <IconBtn text="View plans" />
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Mock Interview">
      <Helmet>
        <title>Mock Interview | Resumify</title>
      </Helmet>

      <AnimatePresence>
      {deleting && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text="Deleting the session..." size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <div className={`h-full max-w-7xl mx-auto w-full flex min-h-0 ${resizing ? 'select-none cursor-col-resize' : ''}`}>

        {/* Left - session list sidebar sir */}
        <div style={{ width: listWidth }} className="shrink-0 border-r border-richblack-700 flex flex-col relative">
          {allSessions.length === 0 ? (
            // nothing to list yet sir — one centered block (button + message) filling the pane,
            // instead of the button pinned at top with the message floating below it
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <IconBtn text="New Interview" onclick={() => setShowModal(true)} customClasses="text-sm">
                <FaPlus />
              </IconBtn>
              <p className="text-xs text-richblack-400">No sessions yet sir — start one and practice for the real thing.</p>
            </div>
          ) : (
            <>
              <div className="p-4">
                <IconBtn text="New Interview" onclick={() => setShowModal(true)} customClasses="w-full justify-center text-sm">
                  <FaPlus />
                </IconBtn>
              </div>
              <div className="flex-1 overflow-y-auto thin-scrollbar px-3 pb-4 space-y-1">
                {allSessions.map((session) => (
                  <div
                    key={session._id}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-200 ${
                      session._id === sessionId ? 'bg-richblack-700 text-richblack-5' : 'text-richblack-200 hover:bg-richblack-800'
                    }`}
                  >
                    <Link to={`/Dashboard/Mock-Interview/${session._id}`} className="flex-1 min-w-0">
                      <p className="text-sm truncate">{session.role}</p>
                      <p className="text-[11px] text-richblack-400">{session.status === 'completed' ? 'Completed' : 'In progress'}</p>
                    </Link>
                    <button
                      onClick={() => handleDelete(session._id)}
                      className="opacity-0 group-hover:opacity-100 text-richblack-400 hover:text-pink-200 transition-all duration-200 cursor-pointer ml-2"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* drag handle sir — same resize pattern as the main dashboard sidebar */}
          <div
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize session list"
            className="absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize group z-10"
          >
            <div className={`h-full w-px mx-auto transition-colors duration-150 ${resizing ? 'bg-yellow-50' : 'bg-transparent group-hover:bg-yellow-50/60'}`} />
          </div>
        </div>

        {/* Right - the session sir */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto thin-scrollbar">
          {!sessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 min-h-0">
              <div className="w-16 h-16 rounded-full bg-yellow-900/15 flex items-center justify-center">
                <FaComments className="text-2xl text-yellow-50" />
              </div>
              <h2 className="font-display text-xl text-richblack-5">Structured Mock Interview</h2>
              <p className="text-sm text-richblack-300 text-center max-w-sm">
                Pick a session from the left, or start a new one with your resume and a job description. One question at a time, honest scored feedback, a stronger sample answer.
              </p>
              <IconBtn text="Start a new interview" onclick={() => setShowModal(true)}>
                <FaPlus />
              </IconBtn>
            </div>
          ) : loading || !currentSession ? (
            <Loading text="Loading the session..." />
          ) : (
            <div className="px-6 py-6 space-y-4 max-w-3xl mx-auto w-full">
              {currentSession.status === 'completed' && (
                <div className="rounded-xl bg-caribgreen-700/20 border border-caribgreen-700 p-4 text-center">
                  <p className="text-sm font-semibold text-caribgreen-100">Session completed — nice work!</p>
                </div>
              )}
              {currentSession.turns.map((turn, index) => (
                <TurnCard
                  key={turn._id}
                  turn={turn}
                  isCurrent={index === currentSession.turns.length - 1 && currentSession.status === 'in-progress'}
                  onSubmitAnswer={handleSubmitAnswer}
                  scoring={scoring}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && <NewSessionModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default MockInterview
