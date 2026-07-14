import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { FaMagic } from 'react-icons/fa'
import { TEMPLATE_REGISTRY } from '../ResumeBuilder/Templates/templateRegistry'
import { SAMPLE_RESUME_DATA } from '../ResumeBuilder/Templates/sampleResumeData'

// real template components sir, rendered tiny with sample content — no more pure-CSS mockups and
// no more empty pages. Same trick as the picker page: scale a full-size template down so the card
// shows the ACTUAL design filled in, not a guess. Hovering reveals a "Use this template" button.
const TemplateCard = ({ name, Component, linkTo }) => (
  <Link to={linkTo} className="group relative shrink-0 w-56 snap-start">
    <div className="relative rounded-xl bg-richblack-5 border border-richblack-700 aspect-[3/4] shadow-lg group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:border-warm-200/50 transition-all duration-300 overflow-hidden">
      <div className="w-full h-full origin-top-left scale-[0.27] pointer-events-none">
        <Component data={SAMPLE_RESUME_DATA} />
      </div>
      {/* hover overlay sir — "Use this template" appears on hover, matches the picker page's CTA */}
      <div className="absolute inset-0 bg-richblack-900/0 group-hover:bg-richblack-900/55 transition-colors duration-300 flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full bg-yellow-50 text-richblack-900 shadow-lg">
          <FaMagic className="text-[10px]" /> Use this template
        </span>
      </div>
    </div>
    <p className="mt-3 text-center text-sm font-semibold text-richblack-5">{name}</p>
  </Link>
)

const TemplateSlider = () => {
  const trackRef = useRef(null)
  const { token } = useSelector((state) => state.auth)

  const scrollBy = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  // logged-in users land straight in the builder picker with this template preselected via the mode already
  // open there; logged-out users go sign up first, same pattern as the rest of the landing page CTAs
  const linkTo = token ? '/Dashboard/Build-Resume' : '/Signup'

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="inline-block mb-3 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
            TEMPLATES
          </span>
          <h2 className="font-display font-bold text-3xl text-richblack-5 tracking-tight">Pick a layout that fits you</h2>
          <p className="text-richblack-300 mt-2">10 ATS-safe designer templates — fill them in and download a PDF.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll templates left"
            className="w-10 h-10 rounded-full border border-richblack-600 flex items-center justify-center text-richblack-100 hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
          >
            <FiChevronLeft />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll templates right"
            className="w-10 h-10 rounded-full border border-richblack-600 flex items-center justify-center text-richblack-100 hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 thin-scrollbar scroll-smooth"
      >
        {TEMPLATE_REGISTRY.map((t) => (
          <TemplateCard key={t.id} name={t.name} Component={t.Component} linkTo={linkTo} />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to={linkTo}
          className="inline-block px-6 py-3 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200"
        >
          Build my resume →
        </Link>
      </div>
    </div>
  )
}

export default TemplateSlider
