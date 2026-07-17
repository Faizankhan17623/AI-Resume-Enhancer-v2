import { motion } from 'motion/react'
import { pageTransition } from '../../utils/motion'

// Wraps a routed page's body sir — replaces the old .animate-fadeIn div
// with a shared Motion mount transition, reused across auth, dashboard, and admin pages.
export default function PageTransition({ className, children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}
