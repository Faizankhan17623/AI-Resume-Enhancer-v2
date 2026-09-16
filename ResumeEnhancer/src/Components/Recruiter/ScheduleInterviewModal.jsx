import { useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaTimes, FaPlus } from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import { InterviewApi } from '../../Services/Apis/InterviewApi'
import { modalBackdrop, modalPanel } from '../../utils/motion'

const emptySlot = () => ({ date: '', startTime: '', duration: '30' })

// recruiter proposes 2-4 candidate slots sir, per direct request — the candidate can only ever
// PICK from these, never add their own (see Models/InterviewSchedule.js's own comment on
// proposedSlots for why). Times are entered in the recruiter's own local time and converted to
// UTC ISO strings before the request goes out; the candidate-side page renders everything back
// in UTC labels (see MyInterviews.jsx's formatSlot) so both sides agree on the same instant
// without either page needing to know the other's timezone.
const ScheduleInterviewModal = ({ applicationId, onClose, onScheduled }) => {
  const { token } = useSelector((s) => s.auth)
  const [slots, setSlots] = useState([emptySlot(), emptySlot()])
  const [meetingLink, setMeetingLink] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const updateSlot = (i, field, value) => {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const addSlot = () => {
    if (slots.length >= 4) return
    setSlots((prev) => [...prev, emptySlot()])
  }

  const removeSlot = (i) => {
    if (slots.length <= 2) return
    setSlots((prev) => prev.filter((_, idx) => idx !== i))
  }

  const toIsoRange = (slot) => {
    if (!slot.date || !slot.startTime) return null
    const start = new Date(`${slot.date}T${slot.startTime}`)
    if (Number.isNaN(start.getTime())) return null
    const end = new Date(start.getTime() + Number(slot.duration || 30) * 60 * 1000)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const parsed = slots.map(toIsoRange)
    if (parsed.some((s) => !s)) {
      toast.error('Fill in a date and time for every slot')
      return
    }

    setBusy(true)
    try {
      const r = await apiConnector('POST', `${InterviewApi.scheduleInterview}/${applicationId}/schedule-interview`, {
        slots: parsed,
        meetingLink: meetingLink.trim() || undefined,
        notes: notes.trim() || undefined,
      }, { Authorization: `Bearer ${token}` })

      if (!r.data.success) throw new Error(r.data.message)
      toast.success('Interview slots sent to the candidate')
      onScheduled?.()
      onClose()
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Could not propose interview slots')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
        className="fixed inset-0 z-[70] bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalPanel}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-richblack-5">Propose interview times</h2>
            <button onClick={onClose} className="text-richblack-400 hover:text-richblack-5 cursor-pointer p-1">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => updateSlot(i, 'date', e.target.value)}
                    required
                    className="rounded-lg bg-richblack-900 border border-richblack-700 px-3 py-2 text-sm text-richblack-5 flex-1"
                  />
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                    required
                    className="rounded-lg bg-richblack-900 border border-richblack-700 px-3 py-2 text-sm text-richblack-5"
                  />
                  <select
                    value={slot.duration}
                    onChange={(e) => updateSlot(i, 'duration', e.target.value)}
                    className="rounded-lg bg-richblack-900 border border-richblack-700 px-2 py-2 text-sm text-richblack-5"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                  {slots.length > 2 && (
                    <button type="button" onClick={() => removeSlot(i)} className="text-richblack-400 hover:text-pink-100 cursor-pointer p-1">
                      <FaTimes className="text-xs" />
                    </button>
                  )}
                </div>
              ))}
              {slots.length < 4 && (
                <button
                  type="button"
                  onClick={addSlot}
                  className="flex items-center gap-1.5 text-xs text-yellow-50 hover:underline cursor-pointer"
                >
                  <FaPlus className="text-[10px]" /> Add another slot
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-richblack-400 mb-1 block">Meeting link (optional)</label>
              <input
                type="text"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Zoom/Meet/Teams link, or a phone number"
                className="w-full rounded-lg bg-richblack-900 border border-richblack-700 px-3 py-2 text-sm text-richblack-5"
              />
            </div>

            <div>
              <label className="text-xs text-richblack-400 mb-1 block">Notes for the candidate (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-16 rounded-lg bg-richblack-900 border border-richblack-700 p-3 text-sm text-richblack-5"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-richblack-900 cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Sending...' : 'Send to candidate'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ScheduleInterviewModal
