import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { MdOutlineDocumentScanner } from 'react-icons/md'

// this app isn't built for phone-width screens sir — layouts like the resume builder, the
// dashboard's resizable sidebar, and side-by-side chat/report panes all assume real desktop
// width. Rather than let a phone visitor hit a half-broken layout somewhere deep in the app,
// this blocks the ENTIRE site up front with a clear "use a bigger screen" message, checked
// against the same breakpoint Tailwind's own `sm:` uses (640px) so it lines up with every
// `sm:`-gated layout already in the app.
const MOBILE_BREAKPOINT = 640

const MobileBlock = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  )

  useEffect(() => {
    // re-checks on resize/rotation sir, not just at first paint — someone who widens their
    // browser window or rotates a tablet into landscape shouldn't have to reload the page
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isMobile) return null

  return (
    <div className="fixed inset-0 z-[999] bg-richblack-900 flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="flex items-center gap-2.5">
        <MdOutlineDocumentScanner className="text-2xl text-yellow-50" />
        <span className="font-display font-bold text-lg text-richblack-5 tracking-tight">
          Resum<span className="text-warm-200">ify</span>
        </span>
      </div>

      <div className="w-16 h-16 rounded-full bg-pink-700/30 border-2 border-pink-700 flex items-center justify-center">
        <FaTimes className="text-pink-100 text-2xl" />
      </div>

      <div className="space-y-2 max-w-xs">
        <h1 className="font-display text-xl text-richblack-5">This site isn't built for mobile</h1>
        <p className="text-sm text-richblack-300">
          Please use it on a desktop, laptop, or in your browser's desktop mode on a bigger screen.
        </p>
      </div>
    </div>
  )
}

export default MobileBlock
