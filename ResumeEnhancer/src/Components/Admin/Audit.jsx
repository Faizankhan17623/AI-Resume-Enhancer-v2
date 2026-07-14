import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import { GetAuditLogs } from '../../Services/operations/Admin'

// color per action type sir — bans red, money yellow, the rest neutral
const actionChip = (action) => {
  if (['USER_BAN', 'USER_DELETE'].includes(action)) return 'bg-pink-700/30 text-pink-100 border-pink-700'
  if (['PLAN_CHANGE', 'CREDIT_ADJUST'].includes(action)) return 'bg-yellow-700/30 text-yellow-25 border-yellow-700'
  if (['USER_UNBAN', 'ROLE_CHANGE'].includes(action)) return 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700'
  return 'bg-richblack-700 text-richblack-100 border-richblack-600'
}

const Audit = () => {
  const [page, setPage] = useState(1)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { auditLogs, loading } = useSelector((state) => state.admin)

  useEffect(() => {
    dispatch(GetAuditLogs(token, page))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Audit Log | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <div className="max-w-7xl mx-auto px-6 py-8 animate-fadeIn">

        <p className="text-sm text-richblack-300 mb-6">
          Every admin action is recorded here sir — who did what, to whom, and when. Nothing gets edited, nothing gets deleted.
        </p>

        {loading ? (
          <Loading text="Loading the audit trail..." />
        ) : auditLogs.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <p className="text-richblack-300 text-sm">No admin actions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log._id} className="rounded-lg bg-richblack-800 shadow-sm shadow-richblack-900/10 px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full border w-fit ${actionChip(log.action)}`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <p className="text-sm text-richblack-100 flex-1 min-w-0">
                  <span className="text-richblack-5 font-medium">{log.actor?.email || 'deleted admin'}</span>
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
      </div>
    </div>
  )
}

export default Audit
