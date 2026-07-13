import { useRef } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

// pure CSS mini resume previews sir — no template system in the backend yet, this is a visual showcase.
// each entry just picks an accent color and a layout shape (sidebar vs top-band vs centered).
const templates = [
  { name: 'Minimal', accent: 'bg-yellow-50', layout: 'top' },
  { name: 'Modern', accent: 'bg-blue-100', layout: 'sidebar' },
  { name: 'Classic', accent: 'bg-warm-200', layout: 'top' },
  { name: 'Creative', accent: 'bg-pink-200', layout: 'sidebar' },
  { name: 'Executive', accent: 'bg-caribgreen-100', layout: 'top' },
  { name: 'Compact', accent: 'bg-yellow-200', layout: 'centered' },
  { name: 'Technical', accent: 'bg-blue-200', layout: 'sidebar' },
  { name: 'Elegant', accent: 'bg-pink-100', layout: 'top' },
  { name: 'Bold', accent: 'bg-caribgreen-200', layout: 'sidebar' },
  { name: 'Fresh Grad', accent: 'bg-warm-100', layout: 'centered' },
]

const TemplateCard = ({ name, accent, layout }) => (
  <div className="shrink-0 w-56 snap-start">
    <div className="rounded-xl bg-richblack-5 border border-richblack-700 p-4 aspect-[3/4] shadow-lg hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {layout === 'sidebar' ? (
        <div className="flex gap-2.5 h-full">
          <div className={`w-1/3 rounded-lg ${accent}/20 p-2 flex flex-col gap-2`}>
            <div className={`w-7 h-7 rounded-full ${accent}`} />
            <div className="h-1 w-full rounded-full bg-richblack-900/20 mt-1" />
            <div className="h-1 w-4/5 rounded-full bg-richblack-900/20" />
            <div className="h-1 w-3/5 rounded-full bg-richblack-900/20" />
          </div>
          <div className="flex-1 flex flex-col gap-2 pt-1">
            <div className="h-1.5 w-3/4 rounded-full bg-richblack-900/60" />
            <div className="h-1 w-full rounded-full bg-richblack-900/15 mt-1.5" />
            <div className="h-1 w-full rounded-full bg-richblack-900/15" />
            <div className="h-1 w-2/3 rounded-full bg-richblack-900/15" />
            <div className="h-1 w-full rounded-full bg-richblack-900/15 mt-2" />
            <div className="h-1 w-4/5 rounded-full bg-richblack-900/15" />
          </div>
        </div>
      ) : layout === 'centered' ? (
        <div className="h-full flex flex-col items-center pt-2">
          <div className={`w-9 h-9 rounded-full ${accent}`} />
          <div className="h-1.5 w-2/3 rounded-full bg-richblack-900/60 mt-3" />
          <div className="h-1 w-1/2 rounded-full bg-richblack-900/25 mt-2" />
          <div className={`h-0.5 w-full ${accent}/40 mt-3`} />
          <div className="w-full flex flex-col gap-1.5 mt-3">
            <div className="h-1 w-full rounded-full bg-richblack-900/15" />
            <div className="h-1 w-full rounded-full bg-richblack-900/15" />
            <div className="h-1 w-3/4 rounded-full bg-richblack-900/15 mx-auto" />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className={`h-8 -m-4 mb-3 ${accent}/25 px-4 flex items-center`}>
            <div className={`h-2 w-1/2 rounded-full ${accent}`} />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1 w-full rounded-full bg-richblack-900/15" />
            <div className="h-1 w-5/6 rounded-full bg-richblack-900/15" />
            <div className="h-1 w-full rounded-full bg-richblack-900/15" />
            <div className="h-1 w-2/3 rounded-full bg-richblack-900/15" />
            <div className="h-1.5 w-1/3 rounded-full bg-richblack-900/40 mt-2" />
            <div className="h-1 w-full rounded-full bg-richblack-900/15" />
            <div className="h-1 w-4/5 rounded-full bg-richblack-900/15" />
          </div>
        </div>
      )}
    </div>
    <p className="mt-3 text-center text-sm font-semibold text-richblack-5">{name}</p>
  </div>
)

const TemplateSlider = () => {
  const trackRef = useRef(null)

  const scrollBy = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-display text-3xl text-richblack-5 tracking-tight">Pick a layout that fits you</h2>
          <p className="text-richblack-300 mt-2">ATS-safe templates, ready to fill with your rewritten content.</p>
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
        {templates.map((t) => (
          <TemplateCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  )
}

export default TemplateSlider
