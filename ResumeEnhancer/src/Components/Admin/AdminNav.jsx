import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'motion/react'
import { FaChartPie, FaUsers, FaRupeeSign, FaClipboardList, FaBullhorn, FaSlidersH } from 'react-icons/fa'

// the admin section switcher sir — sits under the navbar on every admin page.
// Audit Log and Settings are marked adminOnly because their backend routes
// (GET /admin/audit, GET+PATCH /admin/settings) are isAdmin-gated, unlike every
// other tab here which Support can also call — showing the tab to Support would
// just lead to a 403 once they land on the page
const tabs = [
  { name: 'Overview', path: '/Admin', icon: <FaChartPie /> },
  { name: 'Users', path: '/Admin/Users', icon: <FaUsers /> },
  { name: 'Payments', path: '/Admin/Payments', icon: <FaRupeeSign /> },
  { name: 'Audit Log', path: '/Admin/Audit', icon: <FaClipboardList />, adminOnly: true },
  { name: 'Announcements', path: '/Admin/Announcements', icon: <FaBullhorn /> },
  { name: 'Settings', path: '/Admin/Settings', icon: <FaSlidersH />, adminOnly: true },
]

const AdminNav = () => {
  const location = useLocation()
  const { user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'Admin'
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin)

  return (
    <div className="border-b border-richblack-700 bg-richblack-900">
      <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const active = location.pathname === tab.path
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                active ? 'text-yellow-50' : 'text-richblack-300 hover:text-richblack-5'
              }`}
            >
              {tab.icon} {tab.name}
              {active && (
                <motion.span
                  layoutId="admin-nav-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-yellow-50"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default AdminNav
