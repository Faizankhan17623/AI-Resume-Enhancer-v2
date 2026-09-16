import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaHistory } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import Loading from '../extra/Loading'
import { apiConnector } from '../../Services/apiConnector'
import BASE_URL from '../../utils/backendUrl'

// "what have I personally done today" sir, per direct request — hard-scoped server-side to
// the caller's own actions and today's date (see Backend/controllers/AdminSystem.js's
// getMyActivity), this page has no filter controls at all since there's nothing to widen
const actionChip = (action) => {
  if (['USER_BAN', 'USER_DELETE'].includes(action)) return 'bg-pink-700/30 text-pink-100 border-pink-700'
  if (['CREDIT_ADJUST'].includes(action)) return 'bg-yellow-700/30 text-yellow-25 border-yellow-700'
  if (['USER_UNBAN', 'ROLE_CHANGE'].includes(action)) return 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700'
  return 'bg-richblack-700 text-richblack-200 border-richblack-600'
}

const MyActivity = () => {
  const { token } = useSelector((state) => state.auth)
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    apiConnector('GET', `${BASE_URL}/admin/my-activity`, null, { Authorization: `Bearer ${token}` })
      .then((r) => setLogs(r.data.logs))
      .catch(() => setLogs([]))
  }, [token])

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>My Activity | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
          <FaHistory className="text-yellow-50" /> My activity today
        </h2>
        <p className="text-sm text-richblack-400 -mt-4">
          Every action you've personally taken today — resets at midnight.
        </p>

        {!logs ? (
          <Loading text="Loading your activity..." />
        ) : logs.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md p-10 text-center">
            <p className="text-sm text-richblack-400">No actions taken yet today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log._id} className="rounded-lg bg-richblack-800 shadow-sm px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full border w-fit ${actionChip(log.action)}`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-richblack-300 flex-1 min-w-0 truncate">
                  {log.targetEmail || (log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '')}
                </span>
                <span className="text-xs text-richblack-500 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </PageTransition>
    </div>
  )
}

export default MyActivity
