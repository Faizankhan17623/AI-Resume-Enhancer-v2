import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaBullhorn, FaTrash } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import IconBtn from '../extra/IconBtn'
import { GetAnnouncements, CreateAnnouncement, ToggleAnnouncement, DeleteAnnouncement } from '../../Services/operations/Admin'

const Announcements = () => {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { announcements } = useSelector((state) => state.admin)
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    dispatch(GetAnnouncements(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePublish = (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are both required")
      return
    }
    dispatch(CreateAnnouncement(title.trim(), message.trim(), token))
    setTitle('')
    setMessage('')
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Announcements | ResumeEnhancer</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fadeIn">

        {/* Composer sir — Admin only, Support can just view the list */}
        {isAdmin && (
          <form onSubmit={handlePublish} className="rounded-xl bg-richblack-800 border border-richblack-700 p-6 space-y-4">
            <h2 className="text-richblack-5 font-bold flex items-center gap-2"><FaBullhorn className="text-yellow-50" /> Broadcast to every user</h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (max 100 chars)"
              maxLength={100}
              className="w-full rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="The message every user will see on the site banner..."
              maxLength={500}
              rows={3}
              className="w-full rounded-lg bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
            />
            <IconBtn type="submit" text="Publish it" customClasses="text-sm" />
          </form>
        )}

        {/* The list sir */}
        <div className="space-y-3">
          <h2 className="text-richblack-5 font-bold">All announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-richblack-300 py-6 text-center">Nothing broadcast yet sir.</p>
          ) : (
            announcements.map((item) => (
              <div key={item._id} className={`rounded-xl border p-5 flex items-start justify-between gap-4 ${item.active ? 'bg-richblack-800 border-richblack-600' : 'bg-richblack-800/40 border-richblack-700 opacity-70'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-richblack-5">{item.title}</p>
                    {item.active && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-caribgreen-700/30 text-caribgreen-25 border border-caribgreen-700">LIVE</span>
                    )}
                  </div>
                  <p className="text-sm text-richblack-200 mt-1">{item.message}</p>
                  <p className="text-xs text-richblack-400 mt-2">
                    by {item.createdBy?.email || 'admin'} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => dispatch(ToggleAnnouncement(item._id, !item.active, token))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 cursor-pointer ${
                        item.active
                          ? 'text-yellow-25 border-yellow-700 hover:bg-yellow-700/20'
                          : 'text-caribgreen-25 border-caribgreen-700 hover:bg-caribgreen-700/20'
                      }`}
                    >
                      {item.active ? 'Turn off' : 'Go live'}
                    </button>
                    <button
                      onClick={() => dispatch(DeleteAnnouncement(item._id, token))}
                      className="p-2 rounded-lg text-pink-200 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Announcements
