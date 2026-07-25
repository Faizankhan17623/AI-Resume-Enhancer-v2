import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaSearch, FaFileDownload } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { GetAuditLogs, FetchAllAuditLogsForExport } from '../../Services/operations/Admin'
import { downloadCsv } from '../../utils/csvExport'

const AUDIT_CSV_COLUMNS = [
  { key: 'action', label: 'Action' },
  { key: 'actor', label: 'Actor' },
  { key: 'targetEmail', label: 'Target' },
  { key: 'details', label: 'Details' },
  { key: 'when', label: 'When' },
]

// color per action type sir — bans red, money yellow, the rest neutral
const actionChip = (action) => {
  if (['USER_BAN', 'USER_DELETE', 'AI_COST_ALERT'].includes(action)) return 'bg-pink-700/30 text-pink-100 border-pink-700'
  if (['PLAN_CHANGE', 'CREDIT_ADJUST'].includes(action)) return 'bg-yellow-700/30 text-yellow-25 border-yellow-700'
  if (['USER_UNBAN', 'ROLE_CHANGE'].includes(action)) return 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700'
  if (action === 'ACCOUNT_PURGED') return 'bg-blue-700/30 text-blue-100 border-blue-700'
  return 'bg-richblack-700 text-richblack-100 border-richblack-600'
}

// every action type logAction/logSystemAction actually writes sir — kept in sync by hand,
// this is just the filter dropdown's option list
const ACTION_TYPES = [
  'ROLE_CHANGE', 'PLAN_CHANGE', 'USER_BAN', 'USER_UNBAN', 'USER_DELETE', 'CREDIT_ADJUST', 'IMPERSONATE',
  'ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_UPDATE', 'ANNOUNCEMENT_DELETE', 'SETTING_CHANGE',
  'ACCOUNT_PURGED', 'AI_COST_ALERT', 'FEATURE_AUTO_REENABLE',
]

const Audit = () => {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { auditLogs, auditLogsPagination, loading } = useSelector((state) => state.admin)

  useEffect(() => {
    dispatch(GetAuditLogs(token, page, actionFilter, search))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    dispatch(GetAuditLogs(token, 1, actionFilter, search))
  }

  const handleActionFilterChange = (e) => {
    setActionFilter(e.target.value)
    setPage(1)
  }

  // exports EVERYTHING matching the current action/search filter sir, not just the visible
  // page — fetches fresh from the server (capped at 5000 rows) since the paginated Redux
  // state only ever holds one page's worth
  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const data = await FetchAllAuditLogsForExport(token, actionFilter, search)
      const rows = data.logs.map((log) => ({
        action: log.action,
        actor: log.isSystem ? 'System (cron)' : (log.actor?.email || 'deleted admin'),
        targetEmail: log.targetEmail || '',
        details: log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '',
        when: new Date(log.createdAt).toLocaleString(),
      }))
      downloadCsv(`audit-log-export.csv`, rows, AUDIT_CSV_COLUMNS)
      if (data.truncated) {
        toast.error(`Exported the first 5000 of ${data.total} matching entries`)
      } else {
        toast.success(`Exported ${rows.length} entries`)
      }
    } catch {
      toast.error('Could not export the audit log')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Audit Log | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-7xl mx-auto px-6 py-8">

        <p className="text-sm text-richblack-300 mb-6">
          Every admin action is recorded here sir — who did what, to whom, and when. Nothing gets edited, nothing gets deleted.
        </p>

        {/* Search + action filter sir */}
        <div className="flex flex-wrap gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-richblack-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by target or actor email..."
                className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-10 pr-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-yellow-50 text-richblack-900 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer">
              Search
            </button>
          </form>
          <select
            value={actionFilter}
            onChange={handleActionFilterChange}
            className="rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-2.5 text-sm text-richblack-5 cursor-pointer focus:outline-none focus:border-yellow-50 transition-colors duration-200"
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={handleExportCsv}
            disabled={exporting || auditLogs.length === 0}
            title="Export everything matching this filter as CSV"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            <FaFileDownload /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {loading && auditLogs.length === 0 ? (
          <Loading text="Loading the audit trail..." />
        ) : auditLogs.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <p className="text-richblack-300 text-sm">
              {actionFilter || search ? 'No actions match this filter.' : 'No admin actions recorded yet.'}
            </p>
          </div>
        ) : (
          <div className={`space-y-2 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {auditLogs.map((log) => (
              <div key={log._id} className="rounded-lg bg-richblack-800 shadow-sm shadow-richblack-900/10 px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full border w-fit ${actionChip(log.action)}`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <p className="text-sm text-richblack-100 flex-1 min-w-0">
                  <span className="text-richblack-5 font-medium">{log.isSystem ? 'System (cron)' : (log.actor?.email || 'deleted admin')}</span>
                  {log.targetEmail && (
                    <>
                      <span className="text-richblack-400 mx-1.5">→</span>
                      <span className="text-richblack-5 font-medium">{log.targetEmail}</span>
                    </>
                  )}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <span className="text-richblack-300 ml-2 text-xs font-mono">
                      {JSON.stringify(log.details)}
                    </span>
                  )}
                </p>
                <span className="shrink-0 text-xs text-richblack-400">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination sir */}
        {auditLogsPagination && auditLogsPagination.pages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-richblack-300 font-mono">{page} / {auditLogsPagination.pages}</span>
            <button
              disabled={page >= auditLogsPagination.pages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </PageTransition>
    </div>
  )
}

export default Audit
