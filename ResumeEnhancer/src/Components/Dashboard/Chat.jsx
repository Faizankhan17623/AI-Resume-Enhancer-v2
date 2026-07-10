import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { FaPlus, FaPaperPlane, FaTrash, FaRobot, FaFilePdf, FaTimes, FaComments } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { GetAllChats, GetSingleChat, SendMessage, CreateChat, DeleteChat } from '../../Services/operations/Chat'

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
    setPdfFile(file)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!pdfFile) return toast.error("Please upload your resume PDF")
    if (!jd.trim()) return toast.error("Please paste the job description")
    dispatch(CreateChat(pdfFile, jd.trim(), token, navigate))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-richblack-800 border border-richblack-600 p-7 animate-fadeIn">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-richblack-5 font-bold text-lg">New Chat</h2>
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
            <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-richblack-600 p-6 cursor-pointer hover:border-richblack-400 transition-colors duration-200">
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
            className="w-full rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
          />

          <IconBtn type="submit" text={loading ? "Creating..." : "Start the chat"} disabled={loading} customClasses="w-full justify-center" />
        </form>
      </div>
    </div>
  )
}

// ---------- one message bubble sir ----------
const Message = ({ role, content }) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        role === 'user'
          ? 'bg-yellow-50 text-richblack-900 rounded-br-sm'
          : 'bg-richblack-700 text-richblack-25 rounded-bl-sm'
      }`}
    >
      {content}
    </div>
  </div>
)

const Chat = () => {
  const { chatId } = useParams()
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const bottomRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { allChats, currentChat, loading, replying, streamingReply } = useSelector((state) => state.chat)

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
      confirmButtonColor: '#EF476F',
      cancelButtonColor: '#2C333F',
      confirmButtonText: 'Yes, delete it',
      background: '#161D29',
      color: '#F1F2FF'
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(DeleteChat(id, token, navigate))
      }
    })
  }

  return (
    <div className="h-screen w-full bg-richblack-900 flex flex-col overflow-hidden">
      <Helmet>
        <title>AI Coach | ResumeEnhancer</title>
      </Helmet>
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full flex min-h-0">

        {/* Left - chat list sidebar sir */}
        <div className="w-72 shrink-0 border-r border-richblack-700 flex flex-col">
          <div className="p-4">
            <IconBtn text="New Chat" onclick={() => setShowModal(true)} customClasses="w-full justify-center text-sm">
              <FaPlus />
            </IconBtn>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar px-3 pb-4 space-y-1">
            {allChats.length === 0 ? (
              <p className="text-xs text-richblack-400 text-center mt-8 px-4">No chats yet sir — start one and coach your resume.</p>
            ) : (
              allChats.map((chat) => (
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
        </div>

        {/* Right - the thread sir */}
        <div className="flex-1 flex flex-col min-w-0">
          {!chatId ? (
            // no chat open — the empty landing sir
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <div className="w-16 h-16 rounded-full bg-richblack-800 border border-richblack-700 flex items-center justify-center">
                <FaComments className="text-2xl text-yellow-50" />
              </div>
              <h2 className="text-xl font-bold text-richblack-5">Your AI Resume Coach</h2>
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
                  className="flex-1 rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                />
                <IconBtn type="submit" text="" disabled={replying || !message.trim()} customClasses="px-4">
                  <FaPaperPlane />
                </IconBtn>
              </form>
            </>
          )}
        </div>
      </div>

      {showModal && <NewChatModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

export default Chat
