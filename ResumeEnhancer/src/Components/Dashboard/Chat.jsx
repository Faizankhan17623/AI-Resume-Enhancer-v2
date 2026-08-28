import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'motion/react'
import { FaPlus, FaPaperPlane, FaTrash, FaRobot, FaFilePdf, FaTimes, FaComments, FaSearch } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { GetAllChats, GetSingleChat, SendMessage, CreateChat, DeleteChat } from '../../Services/operations/Chat'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// ---------- the new-chat modal sir — resume PDF + JD, costs one credit ----------
const NewChatModal = ({ onClose }) => {
  const [pdfFile, setPdfFile] = useState(null)
  const [jd, setJd] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { loading } = useSelector((state) => state.chat)

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
    await dispatch(CreateChat(pdfFile, jd.trim(), token, navigate))
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
          <h2 className="font-display text-lg text-richblack-5">New Chat</h2>
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

          <IconBtn type="submit" text={loading ? "Creating..." : "Start the chat"} disabled={loading} customClasses="w-full justify-center" />
        </form>
      </motion.div>
    </motion.div>
  )
}

// ---------- one message bubble sir ----------
const Message = ({ role, content }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        role === 'user'
          ? 'bg-yellow-50 text-richblack-900 rounded-br-sm'
          : 'bg-richblack-700 text-richblack-25 rounded-bl-sm'
      }`}
    >
      {content}
    </div>
  </motion.div>
)

const LIST_MIN = 240
const LIST_MAX = 420
const LIST_DEFAULT = 288 // matches the old fixed w-72
const LIST_STORAGE_KEY = 'resumify:chatListWidth'

const Chat = () => {
  const { chatId } = useParams()
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const bottomRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { allChats, currentChat, loading, replying, streamingReply } = useSelector((state) => state.chat)
  const [deleting, setDeleting] = useState(false)

  // chat-list pane width sir — drag the right edge to resize, same pattern as the main
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

  // client-side filter by title sir — the chat list is a user's own small set, no backend
  // search endpoint needed for this
  const visibleChats = chatSearch.trim()
    ? allChats.filter((c) => c.title?.toLowerCase().includes(chatSearch.trim().toLowerCase()))
    : allChats

  useEffect(() => {
    dispatch(GetAllChats(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (chatId) dispatch(GetSingleChat(chatId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  // stay pinned to the newest message sir — also re-runs as streamed tokens grow the live bubble
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages?.length, replying, streamingReply])

  const handleSend = (e) => {
    e.preventDefault()
    if (!message.trim() || replying) return
    dispatch(SendMessage(chatId, message.trim(), token, currentChat))
    setMessage('')
  }

  const handleDelete = (id) => {
    // sweetalert confirm sir — deleting a chat is forever
    Swal.fire({
      title: 'Delete this chat?',
      text: 'All its messages will be gone forever',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C1443C',
      cancelButtonColor: '#3A3428',
      confirmButtonText: 'Yes, delete it',
      background: '#1F1C16',
      color: '#F3EFE6'
    }).then((result) => {
      if (result.isConfirmed) {
        // only clear the open chat + navigate away if THIS is the chat that's currently open sir —
        // deleting a different chat from the sidebar shouldn't kick the user out of the one they're viewing
        const isOpenChat = id === chatId
        dispatch(DeleteChat(id, token, isOpenChat ? navigate : null, setDeleting))
      }
    })
  }

  return (
    <DashboardLayout title="AI Coach">
      <Helmet>
        <title>AI Coach | Resumify</title>
      </Helmet>

      <AnimatePresence>
      {deleting && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text="Deleting the chat..." size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <div className={`h-full max-w-7xl mx-auto w-full flex min-h-0 ${resizing ? 'select-none cursor-col-resize' : ''}`}>

        {/* Left - chat list sidebar sir */}
        <div style={{ width: listWidth }} className="shrink-0 border-r border-richblack-700 flex flex-col relative">
          {allChats.length === 0 ? (
            // nothing to list yet sir — one centered block (button + message) filling the pane,
            // instead of the button pinned at top with the message floating below it
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <IconBtn text="New Chat" onclick={() => setShowModal(true)} customClasses="text-sm">
                <FaPlus />
              </IconBtn>
              <p className="text-xs text-richblack-400">No chats yet sir — start one and coach your resume.</p>
            </div>
          ) : (
            <>
              <div className="p-4 space-y-3">
                <IconBtn text="New Chat" onclick={() => setShowModal(true)} customClasses="w-full justify-center text-sm">
                  <FaPlus />
                </IconBtn>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-richblack-400" />
                  <input
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full rounded-lg bg-richblack-900 border border-richblack-600 pl-8 pr-3 py-2 text-xs text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto thin-scrollbar px-3 pb-4 space-y-1">
                {visibleChats.length === 0 ? (
                  <p className="text-xs text-richblack-400 text-center mt-8 px-4">No chats match "{chatSearch}"</p>
                ) : (
                  visibleChats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-200 ${
                        chat._id === chatId ? 'bg-richblack-700 text-richblack-5' : 'text-richblack-200 hover:bg-richblack-800'
                      }`}
                    >
                      <Link to={`/Dashboard/Chat/${chat._id}`} className="flex-1 min-w-0">
                        <p className="text-sm truncate">{chat.title}</p>
                      </Link>
                      <button
                        onClick={() => handleDelete(chat._id)}
                        className="opacity-0 group-hover:opacity-100 text-richblack-400 hover:text-pink-200 transition-all duration-200 cursor-pointer ml-2"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          {/* drag handle sir — same resize pattern as the main dashboard sidebar */}
          <div
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat list"
            className="absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize group z-10"
          >
            <div className={`h-full w-px mx-auto transition-colors duration-150 ${resizing ? 'bg-yellow-50' : 'bg-transparent group-hover:bg-yellow-50/60'}`} />
          </div>
        </div>

        {/* Right - the thread sir */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!chatId ? (
            // no chat open — the empty landing sir
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 min-h-0">
              <div className="w-16 h-16 rounded-full bg-yellow-900/15 flex items-center justify-center">
                <FaComments className="text-2xl text-yellow-50" />
              </div>
              <h2 className="font-display text-xl text-richblack-5">Your AI Resume Coach</h2>
              <p className="text-sm text-richblack-300 text-center max-w-sm">
                Pick a chat from the left, or start a new one with your resume and a job description.
              </p>
              <IconBtn text="Start a new chat" onclick={() => setShowModal(true)}>
                <FaPlus />
              </IconBtn>
            </div>
          ) : loading || !currentChat ? (
            <Loading text="Loading the chat..." />
          ) : (
            <>
              {/* messages */}
              <div className="flex-1 overflow-y-auto thin-scrollbar px-6 py-6 space-y-4">
                {currentChat.messages.length === 0 && (
                  <div className="text-center mt-10">
                    <FaRobot className="text-3xl text-yellow-50 mx-auto mb-3" />
                    <p className="text-sm text-richblack-300">Ask me anything about your resume and this JD sir.</p>
                  </div>
                )}
                {currentChat.messages.map((msg, index) => (
                  <Message key={index} role={msg.role} content={msg.content} />
                ))}
                {/* the reply grows live as tokens stream in sir — dots show only before the first token lands */}
                {replying && (
                  streamingReply ? (
                    <Message role="assistant" content={streamingReply} />
                  ) : (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm bg-richblack-700 px-5 py-3.5 flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-richblack-300 animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-richblack-300 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-richblack-300 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )
                )}
                <div ref={bottomRef} />
              </div>

              {/* composer */}
              <form onSubmit={handleSend} className="border-t border-richblack-700 p-4 flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask your resume coach..."
                  className="flex-1 rounded-full bg-richblack-800 border border-richblack-600 px-5 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                />
                <IconBtn type="submit" text="" disabled={replying || !message.trim()} customClasses="px-4">
                  <FaPaperPlane />
                </IconBtn>
              </form>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && <NewChatModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default Chat
