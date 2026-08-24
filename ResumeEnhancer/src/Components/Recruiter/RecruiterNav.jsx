import { Link, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { FaBriefcase, FaPlus, FaUserFriends } from 'react-icons/fa'

// mirrors Admin/AdminNav.jsx's tab-bar pattern sir — Recruiter is its own isolated role with
// its own small URL space, no shared tabs with Admin/Support. Jobs are the top-level view now —
// a Test lives inside a Job (see JobBuilder.jsx/TestBuilder.jsx), not standalone.
const tabs = [
  { name: 'My Jobs', path: '/Recruiter', icon: <FaBriefcase /> },
  { name: 'New Job', path: '/Recruiter/New', icon: <FaPlus /> },
  { name: 'Account', path: '/Recruiter/Account', icon: <FaUserFriends /> },
]

const RecruiterNav = () => {
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
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                active ? 'text-yellow-50' : 'text-richblack-300 hover:text-richblack-5'
              }`}
            >
              {tab.icon} {tab.name}
              {active && (
                <motion.span
                  layoutId="recruiter-nav-underline"
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

export default RecruiterNav
