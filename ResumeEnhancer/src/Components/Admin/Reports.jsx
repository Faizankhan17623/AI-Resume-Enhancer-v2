import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaBug, FaLightbulb, FaTrash, FaClipboardList } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import Loading from '../extra/Loading'
import { useMinDurationFlag } from '../../Hooks/useMinDurationFlag'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetReports, UpdateReportStatus, DeleteReport } from '../../Services/operations/Admin'

const TYPE_FILTERS = [
  { label: 'All types', value: '' },
  { label: 'Bugs', value: 'bug' },
  { label: 'Features', value: 'feature' },
]

const STATUS_FILTERS = [
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Planned', value: 'planned' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Declined', value: 'declined' },
  { label: 'All', value: '' },
]

const STATUS_BADGE = {
  open: 'bg-yellow-700/20 text-yellow-25 border-yellow-700',
  in_progress: 'bg-blue-700/20 text-blue-25 border-blue-700',
  planned: 'bg-caribgreen-700/20 text-caribgreen-25 border-caribgreen-700',
  resolved: 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700',
  declined: 'bg-pink-700/20 text-pink-100 border-pink-700',
}

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  planned: 'Planned',
  resolved: 'Resolved',
  declined: 'Declined',
}

const Reports = () => {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  // shows a real loader for at least 4s on either filter switching sir — see
  // Hooks/useMinDurationFlag.js: one shared flag covers both the type and status tabs, since
  // both trigger the exact same re-fetch
  const [switchingFilter, triggerSwitchingFilter] = useMinDurationFlag(4000)
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { reports, loading } = useSelector((state) => state.admin)
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    dispatch(GetReports(token, typeFilter, statusFilter))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter])

  const handleTypeFilterChange = (value) => {
    triggerSwitchingFilter()
    setTypeFilter(value)
  }

  const handleStatusFilterChange = (value) => {
    triggerSwitchingFilter()
    setStatusFilter(value)
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Bug Reports & Suggestions | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
            <FaClipboardList className="text-yellow-50" /> Bug reports & feature suggestions
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-richblack-800 rounded-lg p-1">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleTypeFilterChange(f.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer ${
                    typeFilter === f.value ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-300 hover:text-richblack-5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-richblack-800 rounded-lg p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleStatusFilterChange(f.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer ${
                    statusFilter === f.value ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-300 hover:text-richblack-5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {switchingFilter || (loading && reports.length === 0) ? (
            <Loading text="Loading reports..." />
          ) : reports.length === 0 ? (
            <p className="text-sm text-richblack-300 py-6 text-center">Nothing here sir.</p>
          ) : (
            <motion.div variants={staggerContainer(0.05)} initial={false} animate="show" className="space-y-3">
              <AnimatePresence>
                {reports.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    variants={fadeUp}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-xl border border-richblack-700 bg-richblack-800 p-5 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        {item.type === 'bug' ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-pink-100"><FaBug /> Bug</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-caribgreen-25"><FaLightbulb /> Feature</span>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${STATUS_BADGE[item.status]}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>
                      <p className="font-bold text-richblack-5 mt-1.5">{item.title}</p>
                      <p className="text-xs text-richblack-400 mt-1">
                        {item.user?.firstName} {item.user?.lastName} · {item.user?.email}
                      </p>
                      <p className="text-sm text-richblack-200 mt-2 whitespace-pre-wrap">{item.description}</p>
                      <p className="text-xs text-richblack-400 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <select
                        value={item.status}
                        onChange={(e) => dispatch(UpdateReportStatus(item._id, e.target.value, token, typeFilter, statusFilter))}
                        className="text-xs rounded-lg bg-richblack-700 border border-richblack-600 px-2.5 py-1.5 text-richblack-5 cursor-pointer focus:outline-none focus:border-yellow-50"
                      >
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value} className="bg-richblack-800 text-richblack-5">{label}</option>
                        ))}
                      </select>
                      {isAdmin && (
                        <button
                          onClick={() => dispatch(DeleteReport(item._id, token, typeFilter, statusFilter))}
                          title="Delete"
                          className="p-2 rounded-lg text-pink-200 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      )}
                    </div>
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

export default Reports
