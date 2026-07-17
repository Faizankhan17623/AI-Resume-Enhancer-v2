import { motion } from 'motion/react'

export default function IconBtn({
  text,
  onclick,
  children,
  disabled,
  outline = false,
  customClasses,
  type,
  borderColor = 'border-yellow-50',
  bgColor = 'bg-yellow-50',
}) {
  return (
    <motion.button
      disabled={disabled}
      onClick={onclick}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`flex items-center ${
        outline ? `border ${borderColor} bg-transparent` : bgColor
      } cursor-pointer gap-x-2 rounded-full px-4 py-2.5 font-semibold text-richblack-900 transition-shadow duration-200 hover:shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed ${customClasses}`}
      type={type}
    >
      {children ? (
        <>
          <span className={`${outline && "text-yellow-50"}`}>{text}</span>
          {children}
        </>
      ) : (
        text
      )}
    </motion.button>
  )
}
