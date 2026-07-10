import { Link, useLocation } from 'react-router-dom'
import { FaChartPie, FaUsers, FaRupeeSign, FaClipboardList, FaBullhorn } from 'react-icons/fa'

// the admin section switcher sir — sits under the navbar on every admin page
const tabs = [
  { name: 'Overview', path: '/Admin', icon: <FaChartPie /> },
  { name: 'Users', path: '/Admin/Users', icon: <FaUsers /> },
  { name: 'Payments', path: '/Admin/Payments', icon: <FaRupeeSign /> },
  { name: 'Audit Log', path: '/Admin/Audit', icon: <FaClipboardList /> },
  { name: 'Announcements', path: '/Admin/Announcements', icon: <FaBullhorn /> },
]

const AdminNav = () => {
  const location = useLocation()

  return (
    <div className="border-b border-richblack-700 bg-richblack-900">
      <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-200 ${
                active
                  ? 'border-yellow-50 text-yellow-50'
                  : 'border-transparent text-richblack-300 hover:text-richblack-5'
              }`}
            >
              {tab.icon} {tab.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default AdminNav
