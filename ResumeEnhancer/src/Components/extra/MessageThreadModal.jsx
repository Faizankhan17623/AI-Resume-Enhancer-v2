import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaTimes, FaPaperPlane } from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import { MessageApi } from '../../Services/Apis/MessageApi'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// simple shared thread UI sir, per direct request — no read receipts, no typing
// indicators, no attachments, no real-time push. Send a message, see the bubbles,
// refresh to check for new ones. Used identically from both the candidate side
// (MyApplications.jsx) and the recruiter side (JobApplicantsList.jsx) — the
// backend already tells each caller which role they are via the thread response,
// this component just needs to know which role IT is to align bubbles left/right.
const MessageThreadModal = ({ applicationId, myRole, onClose }) => {
  const { token } = useSelector((s) => s.auth)
  const [thread, setThread] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  // loadError sir, per 2026-11-09 audit — a failed fetch used to call onClose() unconditionally,
  // closing the whole modal (and losing the user's typed draft) over what could just be a brief
  // network blip. Now shows an inline error with a retry instead (retryTick re-runs this effect).
  //
  // alive guard sir, per the same audit — switching applicationId quickly (e.g. recruiter clicks
  // Message on applicant A, then closes and reopens on applicant B before A's slower GET
  // resolves) could let A's stale response land after B's and overwrite the thread actually open.
  useEffect(() => {
    let alive = true
    apiConnector('GET', `${MessageApi.thread}/${applicationId}/messages`, null, { Authorization: `Bearer ${token}` })
      .then((r) => { if (alive) { setThread(r.data.thread); setLoadError(false) } })
      .catch(() => { if (alive) setLoadError(true) })
    return () => { alive = false }
  }, [applicationId, token, retryTick])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages?.length])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const r = await apiConnector('POST', `${MessageApi.thread}/${applicationId}/messages`, { text: text.trim() }, { Authorization: `Bearer ${token}` })
      setThread(r.data.thread)
      setText('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not send the message')
    } finally {
      setSending(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
        className="fixed inset-0 z-[80] bg-[#17140F]/80 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalPanel}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md h-[70vh] rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-richblack-700 shrink-0">
            <h2 className="text-sm font-semibold text-richblack-5">Messages</h2>
            <button onClick={onClose} className="text-richblack-400 hover:text-richblack-5 cursor-pointer p-1">
              <FaTimes />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadError ? (
              <div className="text-center mt-6">
                <p className="text-xs text-richblack-400">Could not load the conversation.</p>
                <button
                  type="button"
                  onClick={() => setRetryTick((t) => t + 1)}
                  className="mt-2 text-xs font-semibold text-yellow-50 hover:underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : !thread ? (
              <p className="text-xs text-richblack-400 text-center mt-6">Loading...</p>
            ) : thread.messages.length === 0 ? (
              <p className="text-xs text-richblack-400 text-center mt-6">No messages yet — say hello.</p>
            ) : thread.messages.map((m, i) => {
              const isMine = m.sender === myRole
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine ? 'bg-yellow-50 text-richblack-900' : 'bg-richblack-900 text-richblack-100 border border-richblack-700'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-richblack-700' : 'text-richblack-500'}`}>
                      {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 px-5 py-4 border-t border-richblack-700 shrink-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg bg-richblack-900 border border-richblack-700 px-3 py-2.5 text-sm text-richblack-5 placeholder:text-richblack-500 focus:outline-none focus:border-yellow-50"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="p-2.5 rounded-lg bg-yellow-50 text-richblack-900 cursor-pointer disabled:opacity-50"
            >
              <FaPaperPlane className="text-sm" />
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default MessageThreadModal
