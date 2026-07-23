import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaPlus, FaTimes, FaTrash, FaPen, FaBuilding, FaMapMarkerAlt, FaExternalLinkAlt, FaBriefcase } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { modalBackdrop, modalPanel, fadeUp, staggerContainer } from '../../utils/motion'
import { GetApplications, CreateApplication, UpdateApplication, DeleteApplication } from '../../Services/operations/Application'

const COLUMNS = [
  { status: 'Applied', label: 'Applied', accent: 'border-blue-700', dot: 'bg-blue-100' },
  { status: 'Interview', label: 'Interview', accent: 'border-yellow-700', dot: 'bg-yellow-50' },
  { status: 'Offer', label: 'Offer', accent: 'border-caribgreen-700', dot: 'bg-caribgreen-100' },
  { status: 'Rejected', label: 'Rejected', accent: 'border-pink-700', dot: 'bg-pink-200' },
]

const emptyForm = { company: '', role: '', location: '', jobUrl: '', notes: '', status: 'Applied' }

// ---------- add/edit modal sir — same form for both, editing pre-fills from the card ----------
const ApplicationModal = ({ editing, onClose }) => {
  const [form, setForm] = useState(editing || emptyForm)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { saving } = useSelector((state) => state.application)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) return

    const ok = editing
      ? await dispatch(UpdateApplication(editing._id, form, token))
      : await dispatch(CreateApplication(form, token))

    if (ok) onClose()
  }

  return (
    <motion.div
      initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
      className="fixed inset-0 z-50 bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <motion.div variants={modalPanel} className="w-full max-w-lg rounded-2xl bg-richblack-800 shadow-2xl shadow-richblack-900/40 p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-richblack-5">{editing ? 'Edit application' : 'Add application'}</h2>
          <button onClick={onClose} className="text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-richblack-300 mb-1.5 block">Company *</label>
              <input
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-richblack-300 mb-1.5 block">Role *</label>
              <input
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
                placeholder="Frontend Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-richblack-300 mb-1.5 block">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
                placeholder="Remote"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-richblack-300 mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
              >
                {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-richblack-300 mb-1.5 block">Job posting URL</label>
            <input
              type="url"
              value={form.jobUrl}
              onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
              className="w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-richblack-300 mb-1.5 block">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50 resize-none"
              placeholder="Referral from Priya, follow up next Friday..."
            />
          </div>

          <IconBtn text={saving ? 'Saving...' : editing ? 'Save changes' : 'Add application'} type="submit" disabled={saving} customClasses="w-full justify-center text-sm" />
        </form>
      </motion.div>
    </motion.div>
  )
}

const ApplicationCard = ({ app, onEdit, onDelete, onDragStart }) => (
  <motion.div
    layout
    variants={fadeUp}
    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    draggable
    onDragStart={(e) => onDragStart(e, app)}
    className="rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-4 cursor-grab active:cursor-grabbing group"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-richblack-5 truncate">{app.role}</p>
        <p className="text-xs text-richblack-300 flex items-center gap-1.5 mt-0.5">
          <FaBuilding className="text-[10px] shrink-0" /> {app.company}
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 text-richblack-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button onClick={() => onEdit(app)} className="hover:text-richblack-5 cursor-pointer" title="Edit">
          <FaPen className="text-xs" />
        </button>
        <button onClick={() => onDelete(app._id)} className="hover:text-pink-200 cursor-pointer" title="Delete">
          <FaTrash className="text-xs" />
        </button>
      </div>
    </div>

    {app.location && (
      <p className="text-xs text-richblack-400 flex items-center gap-1.5 mt-2">
        <FaMapMarkerAlt className="text-[10px] shrink-0" /> {app.location}
      </p>
    )}
    {app.jobUrl && (
      <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-100 hover:underline flex items-center gap-1.5 mt-1.5">
        <FaExternalLinkAlt className="text-[9px] shrink-0" /> Job posting
      </a>
    )}
    <p className="text-[11px] text-richblack-400 mt-2.5">{new Date(app.appliedDate || app.createdAt).toDateString()}</p>
  </motion.div>
)

const Applications = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { applications, loading } = useSelector((state) => state.application)
  const [modalState, setModalState] = useState(null) // null | 'new' | applicationObj
  const [dragOverStatus, setDragOverStatus] = useState(null)

  useEffect(() => {
    dispatch(GetApplications(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragStart = (e, app) => {
    e.dataTransfer.setData('applicationId', app._id)
    e.dataTransfer.setData('fromStatus', app.status)
  }

  const handleDrop = (e, targetStatus) => {
    e.preventDefault()
    setDragOverStatus(null)
    const applicationId = e.dataTransfer.getData('applicationId')
    const fromStatus = e.dataTransfer.getData('fromStatus')
    if (!applicationId || fromStatus === targetStatus) return
    dispatch(UpdateApplication(applicationId, { status: targetStatus }, token, { silent: true }))
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = applications.filter((a) => a.status === col.status)
    return acc
  }, {})

  return (
    <DashboardLayout title="Application Tracker">
      <Helmet>
        <title>Application Tracker | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
          <p className="text-sm text-richblack-300">
            Track every application from applied to offer — drag a card between columns to update its status.
          </p>
          <IconBtn text="Add application" onclick={() => setModalState('new')} customClasses="text-sm shrink-0 ml-4">
            <FaPlus className="text-xs" />
          </IconBtn>
        </div>

        {loading ? (
          <Loading text="Loading your applications..." />
        ) : applications.length === 0 ? (
          <div className="max-w-7xl mx-auto rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <FaBriefcase className="text-3xl text-richblack-400 mx-auto mb-4" />
            <p className="text-richblack-200 mb-2">No applications tracked yet.</p>
            <p className="text-richblack-400 text-sm mb-6">Add the roles you've applied to and watch them move through the pipeline.</p>
            <IconBtn text="Add your first application" onclick={() => setModalState('new')} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <div
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(col.status) }}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`rounded-2xl border-t-4 ${col.accent} bg-richblack-800/40 p-3 min-h-[16rem] transition-colors duration-150 ${
                  dragOverStatus === col.status ? 'bg-richblack-700/60' : ''
                }`}
              >
                <div className="flex items-center gap-2 px-1 mb-3">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <h3 className="text-sm font-semibold text-richblack-5">{col.label}</h3>
                  <span className="text-xs text-richblack-400 ml-auto">{grouped[col.status].length}</span>
                </div>

                <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="show" className="space-y-3">
                  <AnimatePresence>
                    {grouped[col.status].map((app) => (
                      <ApplicationCard
                        key={app._id}
                        app={app}
                        onEdit={setModalState}
                        onDelete={(id) => dispatch(DeleteApplication(id, token))}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </PageTransition>

      <AnimatePresence>
        {modalState && (
          <ApplicationModal
            editing={modalState === 'new' ? null : modalState}
            onClose={() => setModalState(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default Applications
