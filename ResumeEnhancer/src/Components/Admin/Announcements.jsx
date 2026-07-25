import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'motion/react'
import { FaBullhorn, FaTrash, FaEdit, FaTimes } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetAnnouncements, CreateAnnouncement, UpdateAnnouncement, ToggleAnnouncement, DeleteAnnouncement } from '../../Services/operations/Admin'
import { istPartsToUtcDate, utcDateToIstDisplay, utcDateToIstParts, istDateStrFromNow } from '../../utils/istTime'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

const emptySchedule = (dayOffset) => ({ enabled: false, date: istDateStrFromNow(dayOffset), hour: 12, minute: 0, meridiem: 'PM' })

const scheduleFromUtc = (utcDate) => {
  const parts = utcDateToIstParts(utcDate)
  if (!parts) return emptySchedule(1)
  const mm = String(parts.month + 1).padStart(2, '0')
  const dd = String(parts.day).padStart(2, '0')
  return { enabled: true, date: `${parts.year}-${mm}-${dd}`, hour: parts.hour12, minute: parts.minute, meridiem: parts.meridiem }
}

// one small IST date/time picker sir — shared by the "start" and "end" schedule fields below
const SchedulePicker = ({ label, minDate, schedule, onChange }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-xs text-richblack-300">
      <input
        type="checkbox"
        checked={schedule.enabled}
        onChange={(e) => onChange({ ...schedule, enabled: e.target.checked })}
        className="cursor-pointer"
      />
      {label}
    </label>
    {schedule.enabled && (
      <div className="flex flex-wrap gap-2 items-center pl-5">
        <input
          type="date"
          min={minDate}
          value={schedule.date}
          onChange={(e) => onChange({ ...schedule, date: e.target.value })}
          className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5 focus:outline-none focus:border-yellow-50"
        />
        <select
          value={schedule.hour}
          onChange={(e) => onChange({ ...schedule, hour: parseInt(e.target.value) })}
          className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5"
        >
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={schedule.minute}
          onChange={(e) => onChange({ ...schedule, minute: parseInt(e.target.value) })}
          className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5"
        >
          {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
        </select>
        <select
          value={schedule.meridiem}
          onChange={(e) => onChange({ ...schedule, meridiem: e.target.value })}
          className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <span className="text-[10px] text-richblack-400">IST</span>
      </div>
    )}
  </div>
)

const Announcements = () => {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [startSchedule, setStartSchedule] = useState(emptySchedule(1))
  const [endSchedule, setEndSchedule] = useState(emptySchedule(1))
  const [editingId, setEditingId] = useState(null)
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { announcements } = useSelector((state) => state.admin)
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    dispatch(GetAnnouncements(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setMessage('')
    setStartSchedule(emptySchedule(1))
    setEndSchedule(emptySchedule(1))
  }

  const handleEditClick = (item) => {
    setEditingId(item._id)
    setTitle(item.title)
    setMessage(item.message)
    setStartSchedule(item.startsAt ? scheduleFromUtc(item.startsAt) : emptySchedule(1))
    setEndSchedule(item.expiresAt ? scheduleFromUtc(item.expiresAt) : emptySchedule(1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildScheduleDates = () => {
    let startsAt = null
    let expiresAt = null

    if (startSchedule.enabled) {
      const d = istPartsToUtcDate(startSchedule.date, startSchedule.hour, startSchedule.minute, startSchedule.meridiem)
      if (!d) { toast.error('Invalid start date/time'); return null }
      startsAt = d.toISOString()
    }
    if (endSchedule.enabled) {
      const d = istPartsToUtcDate(endSchedule.date, endSchedule.hour, endSchedule.minute, endSchedule.meridiem)
      if (!d) { toast.error('Invalid end date/time'); return null }
      expiresAt = d.toISOString()
    }

    if (startsAt && new Date(startsAt) < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      toast.error('Start date/time must be tomorrow or later')
      return null
    }
    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      toast.error('End date/time must be after the start date/time')
      return null
    }
    if (startsAt && expiresAt && (new Date(expiresAt) - new Date(startsAt)) > 15 * 24 * 60 * 60 * 1000) {
      toast.error("The gap between start and end can't exceed 15 days")
      return null
    }

    return { startsAt, expiresAt }
  }

  const handlePublish = (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are both required")
      return
    }
    const schedule = buildScheduleDates()
    if (schedule === null) return

    if (editingId) {
      dispatch(UpdateAnnouncement(editingId, { title: title.trim(), message: message.trim(), ...schedule }, token))
    } else {
      dispatch(CreateAnnouncement(title.trim(), message.trim(), token, schedule))
    }
    resetForm()
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Announcements | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Composer sir — Admin only, Support can just view the list */}
        {isAdmin && (
          <form onSubmit={handlePublish} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
                <FaBullhorn className="text-yellow-50" /> {editingId ? 'Edit announcement' : 'Broadcast to every user'}
              </h2>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs text-richblack-300 hover:text-richblack-5 flex items-center gap-1 cursor-pointer">
                  <FaTimes /> Cancel edit
                </button>
              )}
            </div>
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

            <div className="grid sm:grid-cols-2 gap-4 rounded-lg bg-richblack-900/40 border border-richblack-700 p-4">
              <SchedulePicker label="Schedule start" minDate={istDateStrFromNow(1)} schedule={startSchedule} onChange={setStartSchedule} />
              <SchedulePicker label="Schedule end" minDate={istDateStrFromNow(1)} schedule={endSchedule} onChange={setEndSchedule} />
            </div>
            <p className="text-[11px] text-richblack-400">
              Leave both unchecked to publish immediately with no expiry. If both are set, the gap between them can't exceed 15 days, and the start must be tomorrow or later (times are IST, 12-hour).
            </p>

            <IconBtn type="submit" text={editingId ? 'Save changes' : 'Publish it'} customClasses="text-sm" />
          </form>
        )}

        {/* The list sir */}
        <div className="space-y-3">
          <h2 className="font-display text-lg text-richblack-5">All announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-richblack-300 py-6 text-center">Nothing broadcast yet sir.</p>
          ) : (
            <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence>
            {announcements.map((item) => (
              <motion.div key={item._id} layout variants={fadeUp} exit={{ opacity: 0, x: -20 }} className={`rounded-xl border p-5 flex items-start justify-between gap-4 ${item.active ? 'bg-richblack-800 border-richblack-600' : 'bg-richblack-800/40 border-richblack-700 opacity-70'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-richblack-5">{item.title}</p>
                    <AnimatePresence>
                    {item.active && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-caribgreen-700/30 text-caribgreen-25 border border-caribgreen-700"
                      >
                        LIVE
                      </motion.span>
                    )}
                    </AnimatePresence>
                  </div>
                  <p className="text-sm text-richblack-200 mt-1">{item.message}</p>
                  <p className="text-xs text-richblack-400 mt-2">
                    by {item.createdBy?.email || 'admin'} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {(item.startsAt || item.expiresAt) && (
                    <p className="text-xs text-richblack-400 mt-1">
                      {item.startsAt && <>Starts {utcDateToIstDisplay(item.startsAt)}</>}
                      {item.startsAt && item.expiresAt && ' · '}
                      {item.expiresAt && <>Ends {utcDateToIstDisplay(item.expiresAt)}</>}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEditClick(item)}
                      title="Edit"
                      className="p-2 rounded-lg text-yellow-50 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                    >
                      <FaEdit className="text-sm" />
                    </button>
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
              </motion.div>
            ))}
            </AnimatePresence>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </div>
  )
}

export default Announcements
