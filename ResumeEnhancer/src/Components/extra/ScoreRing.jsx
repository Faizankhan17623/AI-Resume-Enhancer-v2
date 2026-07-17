import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '../../utils/gsap'

// the big circular ATS score sir — green when good, yellow when average, red when weak
const ScoreRing = ({ score = 0, size = 160 }) => {
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(100, Math.max(0, score))

  const circleRef = useRef(null)
  const numberRef = useRef(null)

  // score colors sir — same rule the backend PDF uses
  const color =
    filled >= 70 ? 'var(--color-caribgreen-100)' :
    filled >= 50 ? 'var(--color-yellow-50)' :
    'var(--color-pink-200)'

  useGSAP(() => {
    const offset = circumference - (filled / 100) * circumference

    if (prefersReducedMotion()) {
      gsap.set(circleRef.current, { strokeDashoffset: offset })
      if (numberRef.current) numberRef.current.textContent = filled
      return
    }

    gsap.set(circleRef.current, { strokeDashoffset: circumference })
    gsap.to(circleRef.current, {
      strokeDashoffset: offset,
      duration: 1.1,
      ease: 'power2.out',
      delay: 0.15,
    })

    if (numberRef.current) {
      const counter = { value: 0 }
      gsap.to(counter, {
        value: filled,
        duration: 1.1,
        ease: 'power2.out',
        delay: 0.15,
        onUpdate: () => {
          numberRef.current.textContent = Math.round(counter.value)
        },
      })
    }
  }, { dependencies: [filled], scope: circleRef })

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
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span ref={numberRef} className="text-4xl font-extrabold text-richblack-5 font-mono">0</span>
        <span className="text-xs text-richblack-300 font-medium">/ 100</span>
      </div>
    </div>
  )
}

export default ScoreRing
