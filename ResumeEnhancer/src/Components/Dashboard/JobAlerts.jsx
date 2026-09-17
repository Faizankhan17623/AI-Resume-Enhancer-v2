import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaBell, FaTrash, FaMapMarkerAlt, FaBriefcase } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import { apiConnector } from '../../Services/apiConnector'
import { JobAlertApi } from '../../Services/Apis/JobAlertApi'

// candidate's saved-search list sir — created from the "Save as alert" button on the public
// job board (Jobs/JobBoard.jsx). Simple management here: toggle active/paused, or remove.
export default function JobAlerts() {
  const { token } = useSelector((s) => s.auth)
  const [alerts, setAlerts] = useState(null)

  const load = () => {
    apiConnector('GET', JobAlertApi.list, null, { Authorization: `Bearer ${token}` })
      .then((r) => setAlerts(r.data.alerts))
      .catch(() => setAlerts([]))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleActive = async (alert) => {
    try {
      await apiConnector('PATCH', `${JobAlertApi.update}/${alert._id}`, { active: !alert.active }, { Authorization: `Bearer ${token}` })
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update this alert')
    }
  }

  const removeAlert = async (alertId) => {
    try {
      await apiConnector('DELETE', `${JobAlertApi.remove}/${alertId}`, null, { Authorization: `Bearer ${token}` })
      toast.success('Alert removed')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not remove this alert')
    }
  }

  if (!alerts) return <DashboardLayout title="Job Alerts"><Loading text="Loading your job alerts..." /></DashboardLayout>

  return (
    <DashboardLayout title="Job Alerts">
      <Helmet><title>Job Alerts | Resumify</title></Helmet>
      <p className="text-sm text-richblack-400 px-4 lg:px-6 pt-4">
        Saved from the job board — we'll email you when a new job matches.
      </p>
      <div className="max-w-2xl mx-auto space-y-4 px-4 lg:px-6 py-4">
        {alerts.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md p-10 text-center">
            <p className="text-sm text-richblack-400">No saved alerts yet — search the job board and click "Save as alert."</p>
          </div>
        ) : alerts.map((alert) => (
          <div key={alert._id} className="rounded-xl bg-richblack-800 p-5 shadow-md flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-richblack-5 font-semibold">
                <FaBell className="text-xs text-yellow-50 shrink-0" /> {alert.keywords}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-richblack-400 flex-wrap">
                {alert.location && <span className="flex items-center gap-1"><FaMapMarkerAlt /> {alert.location}</span>}
                {alert.employmentType && <span className="flex items-center gap-1"><FaBriefcase /> {alert.employmentType}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => toggleActive(alert)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors duration-200 ${
                  alert.active
                    ? 'border-caribgreen-700 text-caribgreen-100 hover:bg-caribgreen-700/20'
                    : 'border-richblack-600 text-richblack-400 hover:bg-richblack-700'
                }`}
              >
                {alert.active ? 'Active' : 'Paused'}
              </button>
              <button
                onClick={() => removeAlert(alert._id)}
                className="p-2 rounded-full text-richblack-400 hover:text-pink-100 cursor-pointer"
              >
                <FaTrash className="text-xs" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
