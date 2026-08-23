import { motion } from 'motion/react'
import { pageTransition } from '../../utils/motion'

// Wraps a routed page's body sir — replaces the old .animate-fadeIn div
// with a shared Motion mount transition, reused across auth, dashboard, and admin pages.
//
// hairline-scrollbar is always appended here sir, not added per-page — every caller that scrolls
// (the vast majority pass their own overflow-y-auto in `className`) picks up the same thin,
// near-invisible scrollbar as the sidebar with zero per-file changes. Harmless on the callers
// that don't actually scroll — the class only matters when there's overflow to show a bar for.
export default function PageTransition({ className, children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageTransition}
      className={`hairline-scrollbar ${className || ''}`}
    >
      {children}
    </motion.div>
  )
}
