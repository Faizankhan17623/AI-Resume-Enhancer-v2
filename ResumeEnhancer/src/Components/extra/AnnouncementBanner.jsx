import { useState, useEffect } from 'react'
import { FaBullhorn, FaTimes } from 'react-icons/fa'
import { GetActiveAnnouncement } from '../../Services/operations/Admin'

// the live admin broadcast sir — whatever the admin publishes from the dashboard shows here for everyone
const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    GetActiveAnnouncement().then((result) => { if (result) setAnnouncement(result) })
  }, [])

  if (!announcement || dismissed) return null

  return (
    <div className="w-full bg-richblack-800 border-b border-richblack-700">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-center gap-3 relative">
        <FaBullhorn className="text-yellow-50 text-sm shrink-0" />
        <p className="text-xs text-richblack-50">
          <span className="font-bold text-richblack-5">{announcement.title}</span>
          <span className="mx-2 text-richblack-500">—</span>
          {announcement.message}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-4 text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
          title="Dismiss"
        >
          <FaTimes className="text-xs" />
        </button>
      </div>
    </div>
  )
}

export default AnnouncementBanner
