import { motion } from 'motion/react'

// circular reverse-countdown ring sir, per direct request — an SVG circle whose stroke drains
// from full to empty over `totalSeconds`, animated via motion (already a dependency, no new
// library needed for this). Pairs with OTP.jsx's own numeric mm:ss text, doesn't replace it.
const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const OtpCountdownRing = ({ secondsLeft, totalSeconds, expired }) => {
  const fraction = Math.max(0, Math.min(1, secondsLeft / totalSeconds))

  return (
    <div className="relative w-20 h-20">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        {/* track sir — the full circle, always visible underneath */}
        <circle
          cx="40" cy="40" r={RADIUS}
          fill="none"
          strokeWidth="6"
          className="stroke-richblack-700"
        />
        {/* progress sir — drains counter-clockwise as secondsLeft falls, since the whole svg is
            rotated -90deg so 12 o'clock is the start point */}
        <motion.circle
          cx="40" cy="40" r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className={expired ? 'stroke-pink-200' : 'stroke-yellow-50'}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - fraction) }}
          // linear + duration matched to a 1s tick sir — this animates smoothly BETWEEN each
          // whole-second state update from OTP.jsx's own setInterval, rather than jumping
          transition={{ duration: 1, ease: 'linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold tabular-nums ${expired ? 'text-pink-200' : 'text-richblack-5'}`}>
          {secondsLeft}
        </span>
      </div>
    </div>
  )
}

export default OtpCountdownRing
