import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { FaPlus, FaFilePdf, FaMagic, FaComments, FaEnvelopeOpenText } from 'react-icons/fa'
import { buttonHover, buttonTap } from '../../utils/motion'

// quick-actions FAB sir — same shortcuts the sidebar already links to, just one thumb-tap away.
// pattern: motion.dev/examples/react-floating-action-button — staggered vertical menu, spring pop, tooltip labels.
const actions = [
  { name: 'New Review', path: '/Dashboard/New-Review', icon: FaFilePdf, color: 'bg-blue-100 text-richblack-900' },
  { name: 'Build Resume', path: '/Dashboard/Build-Resume', icon: FaMagic, color: 'bg-warm-200 text-richblack-900' },
  { name: 'AI Coach', path: '/Dashboard/Chats', icon: FaComments, color: 'bg-caribgreen-100 text-richblack-900' },
  { name: 'Cover Letter', path: '/Dashboard/Cover-Letter', icon: FaEnvelopeOpenText, color: 'bg-yellow-50 text-richblack-900' },
]

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.6 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function QuickActionsFab() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{ show: { transition: { staggerChildren: 0.05 } }, hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } } }}
            className="flex flex-col items-end gap-3"
          >
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <motion.div key={action.path} variants={itemVariants} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-richblack-800 border border-richblack-700 text-xs font-semibold text-richblack-5 shadow-lg whitespace-nowrap">
                    {action.name}
                  </span>
                  <Link to={action.path} onClick={() => setOpen(false)}>
                    <motion.span
                      whileHover={buttonHover}
                      whileTap={buttonTap}
                      className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-base ${action.color}`}
                    >
                      <Icon />
                    </motion.span>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={buttonHover}
        whileTap={buttonTap}
        aria-label="Quick actions"
        className="w-14 h-14 rounded-full bg-yellow-50 text-richblack-900 shadow-xl shadow-yellow-900/30 flex items-center justify-center text-xl cursor-pointer"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          <FaPlus />
        </motion.span>
      </motion.button>
    </div>
  )
}
