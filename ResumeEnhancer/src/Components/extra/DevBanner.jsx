import { FaRocket, FaBolt, FaHardHat } from 'react-icons/fa'

// the rotating under-development strip sir — sits above the navbar on every page
// everything is ONE single continuous line, icons inline, no separators
// the line is rendered twice back to back so the marquee loops without a gap
const DevLine = () => (
  <span className="flex items-center gap-2.5 shrink-0 mx-10 text-xs font-bold text-richblack-900 whitespace-nowrap">
    <FaHardHat className="text-sm" />
    The frontend is still under development, expect changes in every few hours
    <FaBolt className="text-sm" />
    the current UI is not the last one, this is just made to launch the product
    <FaRocket className="text-sm" />
    big things coming soon — stay tuned
  </span>
)

const DevBanner = () => {
  return (
    <div className="w-full h-8 bg-gradient-to-r from-yellow-200 via-yellow-50 to-yellow-200 overflow-hidden flex items-center">
      <div className="flex animate-marquee hover:[animation-play-state:paused]">
        <DevLine />
        <DevLine />
      </div>
    </div>
  )
}

export default DevBanner
