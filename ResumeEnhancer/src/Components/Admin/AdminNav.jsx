import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'motion/react'
import { FaChartPie, FaUsers, FaRupeeSign, FaClipboardList, FaBullhorn, FaSlidersH } from 'react-icons/fa'

// two entirely separate tab sets sir — Admin gets /Admin/*, Support gets its OWN /Support/*
// pages. Support never sees Audit Log or Settings at all (those backend routes are
// isAdmin-gated), not just a hidden tab on a shared page.
const adminTabs = [
  { name: 'Overview', path: '/Admin', icon: <FaChartPie /> },
  { name: 'Users', path: '/Admin/Users', icon: <FaUsers /> },
  { name: 'Payments', path: '/Admin/Payments', icon: <FaRupeeSign /> },
  { name: 'Audit Log', path: '/Admin/Audit', icon: <FaClipboardList /> },
  { name: 'Announcements', path: '/Admin/Announcements', icon: <FaBullhorn /> },
  { name: 'Settings', path: '/Admin/Settings', icon: <FaSlidersH /> },
]

const supportTabs = [
  { name: 'Overview', path: '/Support', icon: <FaChartPie /> },
  { name: 'Users', path: '/Support/Users', icon: <FaUsers /> },
  { name: 'Payments', path: '/Support/Payments', icon: <FaRupeeSign /> },
  { name: 'Announcements', path: '/Support/Announcements', icon: <FaBullhorn /> },
]

// the section switcher sir — sits under the navbar on every admin/support page. Which tab
// set renders is driven entirely by the logged-in user's role, not by which URL they're on,
// so an Admin who somehow lands on a /Support/* page (they shouldn't, SupportRoute blocks it)
// still sees their own real nav rather than a stale one
const AdminNav = () => {
  const location = useLocation()
  const { user } = useSelector((state) => state.auth)
  const tabs = user?.role === 'Admin' ? adminTabs : supportTabs

  return (
    <div className="border-b border-richblack-700 bg-richblack-900">
      <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
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
