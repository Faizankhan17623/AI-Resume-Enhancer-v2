import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { FiBell } from 'react-icons/fi'
import { FaBell } from 'react-icons/fa'
import { GetNotifications, GetUnreadCount, MarkNotificationRead, MarkAllNotificationsRead } from '../../Services/operations/Notification'

// Glassdoor-style ring sir — a quick shake + fill-red the moment unreadCount goes from
// 0 (or first mount) to >0, settling back to a plain outline once read/opened
const ringKeyframes = { rotate: [0, -14, 12, -10, 8, -4, 0] }
const ringTransition = { duration: 0.6, ease: 'easeInOut' }

const POLL_MS = 60 * 1000

// the bell in the navbar sir — polls the cheap unread-count endpoint every minute, only
// loads the full list when the dropdown actually opens
const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const [ringing, setRinging] = useState(false)
  const prevUnreadRef = useRef(0)
  const dropdownRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { notifications, unreadCount, loading } = useSelector((state) => state.notification)

  useEffect(() => {
    dispatch(GetUnreadCount(token))
    const interval = setInterval(() => dispatch(GetUnreadCount(token)), POLL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // shake + fill red only when unread count RISES sir (a fresh notification arriving),
  // not on every poll tick and not when it drops from being marked read
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) setRinging(true)
    prevUnreadRef.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    if (!open) return
    dispatch(GetNotifications(token))

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleItemClick = (item) => {
    if (!item.read) dispatch(MarkNotificationRead(item._id, token))
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen((v) => !v)
          setRinging(false)
        }}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative p-2 shrink-0 border rounded-full transition-all duration-200 cursor-pointer ${
          unreadCount > 0
            ? 'text-pink-200 border-pink-700/60 hover:bg-pink-700/10'
            : 'text-richblack-100 border-richblack-600 hover:bg-richblack-800 hover:text-richblack-5'
        }`}
      >
        <motion.span
          className="block"
          animate={ringing ? ringKeyframes : undefined}
          transition={ringTransition}
          onAnimationComplete={() => setRinging(false)}
        >
          {unreadCount > 0 ? <FaBell className="text-lg" /> : <FiBell className="text-lg" />}
        </motion.span>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-200 text-richblack-900 text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 mt-3 w-80 max-h-[28rem] overflow-y-auto rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-richblack-700">
              <p className="text-sm font-semibold text-richblack-5">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={() => dispatch(MarkAllNotificationsRead(token))}
                  className="text-xs font-medium text-yellow-50 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-richblack-400 text-center py-8">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-richblack-400 text-center py-8 px-4">You're all caught up — no notifications yet.</p>
            ) : (
              <div>
                {notifications.map((item) => (
                  <button
                    key={item._id}
                    role="menuitem"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left flex flex-col gap-0.5 px-4 py-3 border-b border-richblack-700/50 last:border-0 hover:bg-richblack-700/40 transition-colors duration-150 cursor-pointer ${
                      item.read ? '' : 'bg-yellow-900/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!item.read && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-yellow-50 mt-1.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-richblack-5">{item.title}</p>
                        {item.message && <p className="text-xs text-richblack-300 mt-0.5">{item.message}</p>}
                        <p className="text-[11px] text-richblack-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
