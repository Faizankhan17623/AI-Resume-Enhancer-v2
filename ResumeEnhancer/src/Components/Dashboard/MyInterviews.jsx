import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import { apiConnector } from '../../Services/apiConnector'
import { InterviewApi } from '../../Services/Apis/InterviewApi'

const statusMeta = {
  proposed: { label: 'Awaiting your response', className: 'bg-yellow-700/30 text-yellow-25 border-yellow-700' },
  confirmed: { label: 'Confirmed', className: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700' },
  cancelled: { label: 'Cancelled', className: 'bg-pink-700/30 text-pink-100 border-pink-700' },
  expired: { label: 'Expired', className: 'bg-richblack-700 text-richblack-300 border-richblack-600' },
}

const formatSlot = (slot) => {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const dateLabel = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const startLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  const endLabel = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return `${dateLabel}, ${startLabel} – ${endLabel} UTC`
}

// candidate's own interview list sir — every InterviewSchedule where they're the candidate,
// newest first. A 'proposed' one lets them pick a slot right here; a 'confirmed' one just shows
// the details (the .ics already landed in their inbox, this page isn't a calendar itself).
export default function MyInterviews() {
  const { token } = useSelector((s) => s.auth)
  const [schedules, setSchedules] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    apiConnector('GET', InterviewApi.myInterviews, null, { Authorization: `Bearer ${token}` })
      .then((r) => setSchedules(r.data.schedules))
      .catch(() => setSchedules([]))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const confirmSlot = async (scheduleId, slotIndex) => {
    setBusyId(scheduleId)
    try {
      const r = await apiConnector('POST', `${InterviewApi.confirmSlot}/${scheduleId}/confirm`, { slotIndex }, { Authorization: `Bearer ${token}` })
      if (!r.data.success) throw new Error(r.data.message)
      toast.success('Interview confirmed — check your email for the calendar invite')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Could not confirm this slot')
    } finally {
      setBusyId(null)
    }
  }

  const cancel = async (scheduleId) => {
    setBusyId(scheduleId)
    try {
      const r = await apiConnector('PATCH', `${InterviewApi.cancelInterview}/${scheduleId}/cancel`, {}, { Authorization: `Bearer ${token}` })
      if (!r.data.success) throw new Error(r.data.message)
      toast.success('Interview cancelled')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Could not cancel this interview')
    } finally {
      setBusyId(null)
    }
  }

  if (!schedules) return <DashboardLayout><Loading text="Loading your interviews..." /></DashboardLayout>

  return (
    <DashboardLayout>
      <Helmet><title>My Interviews | Resumify</title></Helmet>
      <div className="max-w-3xl space-y-4">
        <div>
          <h1 className="font-display text-2xl text-richblack-5">My Interviews</h1>
          <p className="text-sm text-richblack-400 mt-1">Recruiters propose times here once you've completed a job's test.</p>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md p-10 text-center">
            <p className="text-sm text-richblack-400">No interview invitations yet.</p>
          </div>
        ) : schedules.map((s) => {
          const meta = statusMeta[s.status] || statusMeta.expired
          return (
            <section key={s._id} className="rounded-2xl bg-richblack-800 p-5 shadow-md">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                <div>
                  <p className="text-richblack-5 font-semibold">{s.job?.title}</p>
                  <p className="text-xs text-richblack-400">{s.job?.companyName}</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${meta.className}`}>
                  {meta.label}
                </span>
              </div>

              {s.status === 'proposed' && (
                <div className="space-y-2">
                  <p className="text-xs text-richblack-400 mb-1">Pick a time that works for you:</p>
                  {s.proposedSlots.map((slot, i) => (
                    <button
                      key={i}
                      disabled={busyId === s._id}
                      onClick={() => confirmSlot(s._id, i)}
                      className="w-full text-left rounded-lg bg-richblack-900 border border-richblack-700 hover:border-yellow-50 px-4 py-3 text-sm text-richblack-5 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                    >
                      🗓️ {formatSlot(slot)}
                    </button>
                  ))}
                  <button
                    disabled={busyId === s._id}
                    onClick={() => cancel(s._id)}
                    className="text-xs text-richblack-400 hover:text-pink-100 cursor-pointer mt-1"
                  >
                    None of these work for me
                  </button>
                </div>
              )}

              {s.status === 'confirmed' && s.confirmedSlot && (
                <div className="rounded-lg bg-richblack-900 border border-richblack-700 px-4 py-3">
                  <p className="text-sm text-richblack-5">🗓️ {formatSlot(s.confirmedSlot)}</p>
                  {s.meetingLink && (
                    <a href={s.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-yellow-50 hover:underline break-all mt-1 inline-block">
                      {s.meetingLink}
                    </a>
                  )}
                  <button
                    disabled={busyId === s._id}
                    onClick={() => cancel(s._id)}
                    className="block text-xs text-richblack-400 hover:text-pink-100 cursor-pointer mt-2"
                  >
                    Cancel this interview
                  </button>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
