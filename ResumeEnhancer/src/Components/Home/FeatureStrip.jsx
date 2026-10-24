import { FaCheckCircle, FaFileAlt, FaEnvelopeOpenText, FaCommentDots, FaSearch, FaMicrophone, FaChartLine, FaClipboardList } from 'react-icons/fa'
import { InfiniteSlider } from '../Animated/InfiniteSlider'
import { prefersReducedMotion } from '../../utils/gsap'

// real product capabilities only sir (no invented social proof) — a slow, pause-on-hover marquee
// that gives the landing page a bit of motion between the hero and the "how it works" grid
const FEATURES = [
  { icon: <FaCheckCircle />, label: 'ATS score in seconds' },
  { icon: <FaSearch />, label: 'Keyword match vs the job description' },
  { icon: <FaFileAlt />, label: 'Resume builder with live templates' },
  { icon: <FaEnvelopeOpenText />, label: 'AI cover letters' },
  { icon: <FaCommentDots />, label: 'Outreach emails & LinkedIn DMs' },
  { icon: <FaClipboardList />, label: 'Application tracker with rejection diagnosis' },
  { icon: <FaMicrophone />, label: 'Mock interviews' },
  { icon: <FaChartLine />, label: 'Score history & progress' },
]

const FeatureChip = ({ icon, label }) => (
  <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-richblack-800 border border-richblack-700 text-sm font-medium text-richblack-100 whitespace-nowrap">
    <span className="text-warm-200">{icon}</span>
    {label}
  </span>
)

const FeatureStrip = () => {
  // a still, wrapped row for reduced-motion users instead of an endlessly scrolling one
  if (prefersReducedMotion()) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap justify-center gap-3">
        {FEATURES.map((f) => <FeatureChip key={f.label} {...f} />)}
      </div>
    )
  }

  return (
    <div
      className="py-6 border-y border-richblack-800 bg-richblack-900/60"
      style={{ maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)' }}
    >
      <InfiniteSlider gap={16} speed={40} speedOnHover={14}>
        {FEATURES.map((f) => <FeatureChip key={f.label} {...f} />)}
      </InfiniteSlider>
    </div>
  )
}

export default FeatureStrip
