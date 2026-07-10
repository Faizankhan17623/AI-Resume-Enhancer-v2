import React from 'react'

// the big circular ATS score sir — green when good, yellow when average, red when weak
const ScoreRing = ({ score = 0, size = 160 }) => {
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(100, Math.max(0, score))
  const offset = circumference - (filled / 100) * circumference

  // score colors sir — same rule the backend PDF uses
  const color =
    filled >= 70 ? 'var(--color-caribgreen-100)' :
    filled >= 50 ? 'var(--color-yellow-50)' :
    'var(--color-pink-200)'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-richblack-700)"
          strokeWidth={stroke}
        />
        {/* fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-extrabold text-richblack-5 font-mono">{filled}</span>
        <span className="text-xs text-richblack-300 font-medium">/ 100</span>
      </div>
    </div>
  )
}

export default ScoreRing
