import { FaRocket, FaSmile, FaEdit, FaCheckCircle, FaLightbulb, FaBriefcase } from 'react-icons/fa'
import useGsapReveal from '../../Hooks/useGsapReveal'

const tiles = [
  {
    icon: <FaRocket />,
    bg: 'bg-warm-25',
    ring: 'group-hover:ring-warm-200/40',
    title: 'Get Scored in Minutes',
    desc: 'Upload your resume and a job description — our AI reads it like a real ATS and scores it instantly.',
  },
  {
    icon: <FaSmile />,
    bg: 'bg-yellow-25',
    ring: 'group-hover:ring-yellow-100/40',
    title: 'See Exactly What Is Missing',
    desc: 'Missing keywords, weak sections, and red flags are called out line by line, not buried in a generic summary.',
  },
  {
    icon: <FaEdit />,
    bg: 'bg-blue-25',
    ring: 'group-hover:ring-blue-100/40',
    title: 'Get Rewritten Content',
    desc: 'Before/after rewrites for every weak bullet point, ready to paste straight into your resume.',
  },
  {
    icon: <FaCheckCircle />,
    bg: 'bg-caribgreen-25',
    ring: 'group-hover:ring-caribgreen-100/40',
    title: 'Scan for ATS Compatibility',
    desc: 'A deterministic structural check catches multi-column layouts, missing text layers, and other parsing traps.',
  },
  {
    icon: <FaLightbulb />,
    bg: 'bg-warm-25',
    ring: 'group-hover:ring-warm-200/40',
    title: 'Track Your Progress',
    desc: 'Rescore after every edit and watch your score climb, with a full history of every review you have run.',
  },
  {
    icon: <FaBriefcase />,
    bg: 'bg-yellow-25',
    ring: 'group-hover:ring-yellow-100/40',
    title: 'Go Further With AI Coach',
    desc: 'Chat with the AI about your career, generate a tailored cover letter, and search for matching roles.',
  },
]

const HowItWorks = () => {
  const scope = useGsapReveal()

  return (
    <div ref={scope} className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
          HOW IT WORKS
        </span>
        <h2 className="font-display font-bold text-3xl lg:text-4xl text-richblack-5 tracking-tight">
          Everything You Need, <span className="text-warm-200">In One Place</span>
        </h2>
        <p className="mt-3 text-richblack-300 text-lg max-w-xl mx-auto">
          From first upload to final polish — here's what Resumify does for every review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiles.map((tile, i) => (
          <div
            key={i}
            data-reveal
            className="group relative rounded-2xl bg-richblack-800 border border-richblack-700 p-7 transition-all duration-300 hover:-translate-y-2 hover:border-richblack-500 hover:shadow-2xl hover:shadow-richblack-900/40"
          >
            <div className={`w-14 h-14 rounded-full ${tile.bg} ring-4 ring-transparent ${tile.ring} flex items-center justify-center mb-5 text-xl text-richblack-900 transition-all duration-300`}>
              {tile.icon}
            </div>
            <h3 className="font-display font-bold text-lg text-richblack-5 mb-2">{tile.title}</h3>
            <p className="text-richblack-300 text-sm leading-relaxed">{tile.desc}</p>

            {/* index number sir — small editorial touch, echoes the step-by-step feel */}
            <span className="absolute top-6 right-7 font-display font-bold text-2xl text-richblack-700 group-hover:text-richblack-600 transition-colors duration-300">
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HowItWorks
