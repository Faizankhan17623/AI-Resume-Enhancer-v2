import { FaQuoteLeft, FaStar } from 'react-icons/fa'
import useGsapReveal from '../../Hooks/useGsapReveal'

const testimonials = [
  {
    name: 'Ananya Sharma',
    role: 'Frontend Developer',
    avatarBg: 'bg-warm-25',
    initials: 'AS',
    quote: 'Resumify pointed out three missing keywords from the job description that I would have never caught myself. Got an interview call within a week.',
  },
  {
    name: 'Rohit Verma',
    role: 'Data Analyst',
    avatarBg: 'bg-yellow-25',
    initials: 'RV',
    quote: 'The ATS formatting scan flagged a multi-column layout issue on my resume. Fixed it in ten minutes and my score jumped right after.',
  },
  {
    name: 'Priya Nair',
    role: 'Product Manager',
    avatarBg: 'bg-blue-25',
    initials: 'PN',
    quote: 'The rewritten bullet points felt like they were written by an actual recruiter. Way better than the generic tips I got from other tools.',
  },
]

const Testimonials = () => {
  const scope = useGsapReveal()

  return (
    <div ref={scope} className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
          TESTIMONIALS
        </span>
        <h2 className="font-display font-bold text-3xl lg:text-4xl text-richblack-5 tracking-tight">
          Loved By <span className="text-warm-200">Job Seekers</span>
        </h2>
        <p className="mt-3 text-richblack-300 text-lg max-w-xl mx-auto">
          A few words from people who used Resumify to land more interviews.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <div
            key={i}
            data-reveal
            className="group relative rounded-2xl bg-richblack-800 border border-richblack-700 p-7 transition-all duration-300 hover:-translate-y-2 hover:border-richblack-500 hover:shadow-2xl hover:shadow-richblack-900/40"
          >
            <FaQuoteLeft className="text-2xl text-richblack-700 mb-4" />

            <div className="flex gap-1 mb-4 text-warm-200 text-sm">
              {Array.from({ length: 5 }).map((_, s) => (
                <FaStar key={s} />
              ))}
            </div>

            <p className="text-richblack-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>

            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full ${t.avatarBg} flex items-center justify-center font-display font-bold text-richblack-900`}>
                {t.initials}
              </div>
              <div>
                <p className="font-semibold text-richblack-5 text-sm">{t.name}</p>
                <p className="text-richblack-400 text-xs">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Testimonials
