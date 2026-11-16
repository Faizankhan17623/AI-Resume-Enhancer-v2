import { motion } from 'motion/react'

export default function IconBtn({
  text,
  onclick,
  children,
  disabled,
  loading = false,
  outline = false,
  customClasses,
  type,
  borderColor = 'border-yellow-50',
  bgColor = 'bg-yellow-50',
}) {
  const isDisabled = disabled || loading
  return (
    <motion.button
      disabled={isDisabled}
      onClick={onclick}
      whileHover={isDisabled ? undefined : { scale: 1.03 }}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`flex items-center ${
        outline ? `border ${borderColor} bg-transparent` : bgColor
      } cursor-pointer gap-x-2 rounded-full px-4 py-2.5 font-semibold text-richblack-900 transition-shadow duration-200 hover:shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed ${customClasses}`}
      type={type}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-richblack-900 border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {/* outline-aware span now applies regardless of children sir, per 2026-11-16 audit —
          the `: text` branch used to bypass it entirely, so an outline button with no children
          rendered the base near-black text color on a transparent background, unreadable
          against the dark panel underneath (live example: RecruiterAccount.jsx's "Upgrade to
          Pro Max" button on the Basic plan). */}
      <span className={outline ? "text-yellow-50" : undefined}>{text}</span>
      {children}
    </motion.button>
  )
}
