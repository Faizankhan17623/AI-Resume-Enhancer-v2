import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowRight, FaCheckCircle, FaStar } from 'react-icons/fa'
import { MdOutlineDocumentScanner, MdOutlineGpsFixed, MdOutlineEdit } from 'react-icons/md'
import IconBtn from '../extra/IconBtn'

const Banner = () => {
  const { token } = useSelector((state) => state.auth)

  const callouts = [
    { icon: <MdOutlineDocumentScanner className="text-2xl text-richblack-900" />, bg: 'bg-blue-25', desc: 'Upload your resume and get an ATS score in seconds.' },
    { icon: <MdOutlineGpsFixed className="text-2xl text-richblack-900" />, bg: 'bg-warm-25', desc: 'See exactly which keywords the job description is looking for.' },
    { icon: <MdOutlineEdit className="text-2xl text-richblack-900" />, bg: 'bg-yellow-25', desc: 'Get line-by-line before/after rewrites that raise your score.' },
  ]

  return (
    <div className="relative w-full bg-richblack-900 overflow-hidden">
      {/* layered gradient-mesh glow sir — bigger, more saturated than before, gives the hero actual depth */}
      <div className="pointer-events-none absolute -top-32 right-[-10%] w-[560px] h-[560px] rounded-full bg-warm-200/10 blur-[110px]" />
      <div className="pointer-events-none absolute top-1/3 left-[-10%] w-[420px] h-[420px] rounded-full bg-yellow-100/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[20%] w-[380px] h-[380px] rounded-full bg-blue-100/10 blur-[110px]" />
      {/* faint dot-grid texture sir — subtle, only visible in the hero band */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '28px 28px', color: 'var(--color-richblack-600)' }}
      />

      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center animate-fadeIn">

        <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-bold rounded-full bg-richblack-800 text-yellow-50 border border-richblack-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-50 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-50" />
          </span>
          AI-POWERED ATS RESUME REVIEWER
        </span>

        <h1 className="font-display font-bold text-4xl lg:text-6xl text-richblack-5 tracking-tight leading-[1.1]">
          <span className="relative inline-block text-warm-200">
            75% Fewer
            <svg className="absolute left-0 -bottom-2 w-full h-3 text-warm-200/40" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2,9 Q50,2 100,7 T198,5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span>{' '}
          Resume Rejections
        </h1>

        <p className="mt-7 text-richblack-200 text-lg max-w-2xl mx-auto leading-relaxed">
          Resumify's AI reviewer helps you craft applications that pass real ATS software and
          earn more interviews — upload your resume and a job description to get an honest
          score with line-by-line fixes, in seconds.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link to={token ? "/Dashboard/New-Review" : "/Signup"}>
            <IconBtn text={token ? "Analyze my resume" : "Start free — 5 reviews"} customClasses="text-base px-7 py-3.5 shadow-lg shadow-yellow-900/20 hover:shadow-xl hover:shadow-yellow-900/30 hover:-translate-y-0.5">
              <FaArrowRight />
            </IconBtn>
          </Link>
          <Link to="/Pricing">
            <button className="px-7 py-3.5 text-base font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              See pricing
            </button>
          </Link>
        </div>

        {/* trust strip sir — quick social proof under the CTAs */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-richblack-300">
          <div className="flex text-warm-200">
            {[...Array(5)].map((_, i) => <FaStar key={i} />)}
          </div>
          <span>Trusted by job seekers who got past the bots</span>
        </div>

        {/* Icon-circle callouts sir — MyPerfectResume "42% Higher" section pattern, now with hover lift */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {callouts.map((c, i) => (
            <div key={i} className="group flex flex-col items-center transition-transform duration-300 hover:-translate-y-1.5">
              <div className={`w-20 h-20 rounded-full ${c.bg} flex items-center justify-center mb-4 shadow-md group-hover:shadow-xl transition-shadow duration-300`}>
                {c.icon}
              </div>
              <p className="text-richblack-200 text-sm max-w-[220px] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Resume + score mockup sir, kept as a supporting visual under the fold */}
        <div className="relative mt-4 max-w-sm mx-auto">
          <div className="rounded-2xl bg-richblack-5 border border-richblack-700 p-7 shadow-2xl text-left transition-transform duration-500 hover:-translate-y-1.5 hover:rotate-0 rotate-[-1deg]">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-richblack-900/10">
              <div className="w-12 h-12 rounded-full bg-warm-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-3 w-2/3 rounded-full bg-richblack-900/70" />
                <div className="h-2 w-1/2 rounded-full bg-richblack-900/30 mt-2" />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="h-2 w-24 rounded-full bg-blue-100/70 mb-2.5" />
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-richblack-900/15" />
                  <div className="h-1.5 w-11/12 rounded-full bg-richblack-900/15" />
                  <div className="h-1.5 w-4/5 rounded-full bg-richblack-900/15" />
                </div>
              </div>
              <div>
                <div className="h-2 w-28 rounded-full bg-blue-100/70 mb-2.5" />
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-richblack-900/15" />
                  <div className="h-1.5 w-3/4 rounded-full bg-richblack-900/15" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['React', 'Node.js', 'SQL', 'AWS'].map((skill) => (
                  <span key={skill} className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-caribgreen-100/15 text-caribgreen-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* floating ATS score badge sir */}
          <div className="absolute -bottom-6 -right-4 rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl px-5 py-4 flex items-center gap-3 animate-fadeIn">
            <div className="w-11 h-11 rounded-full bg-caribgreen-100/15 flex items-center justify-center">
              <FaCheckCircle className="text-caribgreen-100 text-lg" />
            </div>
            <div>
              <p className="text-xs text-richblack-300 text-left">ATS Score</p>
              <p className="font-display font-bold text-2xl text-caribgreen-100 leading-none mt-0.5">87</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Banner
