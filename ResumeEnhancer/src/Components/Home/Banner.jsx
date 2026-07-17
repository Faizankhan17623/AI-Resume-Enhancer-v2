import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGSAP } from '@gsap/react'
import { FaArrowRight, FaCheckCircle, FaStar } from 'react-icons/fa'
import { MdOutlineDocumentScanner, MdOutlineGpsFixed, MdOutlineEdit } from 'react-icons/md'
import IconBtn from '../extra/IconBtn'
import { gsap, SplitText, prefersReducedMotion } from '../../utils/gsap'

const Banner = () => {
  const { token } = useSelector((state) => state.auth)
  const rootRef = useRef(null)

  useGSAP(() => {
    if (prefersReducedMotion()) return

    const split = new SplitText(rootRef.current.querySelector('[data-hero-heading]'), {
      type: 'words,chars',
    })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.from(rootRef.current.querySelector('[data-hero-badge]'), { opacity: 0, y: -10, duration: 0.4 })
      .from(split.chars, { opacity: 0, y: 24, rotateX: -40, stagger: 0.015, duration: 0.6 }, '-=0.15')
      .from(rootRef.current.querySelector('[data-hero-copy]'), { opacity: 0, y: 16, duration: 0.5 }, '-=0.3')
      .from(rootRef.current.querySelectorAll('[data-hero-cta]'), { opacity: 0, y: 16, stagger: 0.1, duration: 0.5 }, '-=0.3')
      .from(rootRef.current.querySelector('[data-hero-trust]'), { opacity: 0, duration: 0.4 }, '-=0.2')
      .from(rootRef.current.querySelectorAll('[data-hero-callout]'), { opacity: 0, y: 20, stagger: 0.12, duration: 0.5 }, '-=0.2')
      .from(rootRef.current.querySelector('[data-hero-mockup]'), { opacity: 0, y: 30, scale: 0.96, duration: 0.6 }, '-=0.3')
      .from(rootRef.current.querySelector('[data-hero-badge2]'), { opacity: 0, scale: 0.7, duration: 0.4, ease: 'back.out(1.7)' }, '-=0.2')

    return () => split.revert()
  }, { scope: rootRef })

  const callouts = [
    { icon: <MdOutlineDocumentScanner className="text-2xl text-richblack-900" />, bg: 'bg-blue-25', desc: 'Upload your resume and get an ATS score in seconds.' },
    { icon: <MdOutlineGpsFixed className="text-2xl text-richblack-900" />, bg: 'bg-warm-25', desc: 'See exactly which keywords the job description is looking for.' },
    { icon: <MdOutlineEdit className="text-2xl text-richblack-900" />, bg: 'bg-yellow-25', desc: 'Get line-by-line before/after rewrites that raise your score.' },
  ]

  return (
    <div ref={rootRef} className="relative w-full bg-richblack-900 overflow-hidden">
      {/* layered gradient-mesh glow sir — bigger, more saturated than before, gives the hero actual depth */}
      <div className="pointer-events-none absolute -top-32 right-[-10%] w-[560px] h-[560px] rounded-full bg-warm-200/10 blur-[110px]" />
      <div className="pointer-events-none absolute top-1/3 left-[-10%] w-[420px] h-[420px] rounded-full bg-yellow-100/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[20%] w-[380px] h-[380px] rounded-full bg-blue-100/10 blur-[110px]" />
      {/* faint dot-grid texture sir — subtle, only visible in the hero band */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '28px 28px', color: 'var(--color-richblack-600)' }}
      />

      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">

        <span data-hero-badge className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-bold rounded-full bg-richblack-800 text-yellow-50 border border-richblack-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-50 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-50" />
          </span>
          AI-POWERED ATS RESUME REVIEWER
        </span>

        <h1 data-hero-heading className="font-display font-bold text-4xl lg:text-6xl text-richblack-5 tracking-tight leading-[1.1]">
          <span className="relative inline-block text-warm-200">
            75% Fewer
            <svg className="absolute left-0 -bottom-2 w-full h-3 text-warm-200/40" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2,9 Q50,2 100,7 T198,5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span>{' '}
          Resume Rejections
        </h1>

        <p data-hero-copy className="mt-7 text-richblack-200 text-lg max-w-2xl mx-auto leading-relaxed">
          Resumify's AI reviewer helps you craft applications that pass real ATS software and
          earn more interviews — upload your resume and a job description to get an honest
          score with line-by-line fixes, in seconds.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link data-hero-cta to={token ? "/Dashboard/New-Review" : "/Signup"}>
            <IconBtn text={token ? "Analyze my resume" : "Start free — 5 reviews"} customClasses="text-base px-7 py-3.5 shadow-lg shadow-yellow-900/20 hover:shadow-xl hover:shadow-yellow-900/30 hover:-translate-y-0.5">
              <FaArrowRight />
            </IconBtn>
          </Link>
          <Link data-hero-cta to="/Pricing">
            <button className="px-7 py-3.5 text-base font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              See pricing
            </button>
          </Link>
        </div>

        {/* trust strip sir — quick social proof under the CTAs */}
        <div data-hero-trust className="mt-6 flex items-center justify-center gap-2 text-xs text-richblack-300">
          <div className="flex text-warm-200">
            {[...Array(5)].map((_, i) => <FaStar key={i} />)}
          </div>
          <span>Trusted by job seekers who got past the bots</span>
        </div>

        {/* Icon-circle callouts sir — MyPerfectResume "42% Higher" section pattern, now with hover lift */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {callouts.map((c, i) => (
            <div key={i} data-hero-callout className="group flex flex-col items-center transition-transform duration-300 hover:-translate-y-1.5">
              <div className={`w-20 h-20 rounded-full ${c.bg} flex items-center justify-center mb-4 shadow-md group-hover:shadow-xl transition-shadow duration-300`}>
                {c.icon}
              </div>
              <p className="text-richblack-200 text-sm max-w-[220px] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Resume + score mockup sir, kept as a supporting visual under the fold */}
        <div data-hero-mockup className="relative mt-4 max-w-sm mx-auto">
          <div className="rounded-2xl bg-richblack-5 border border-richblack-700 p-7 shadow-2xl text-left transition-transform duration-500 hover:-translate-y-1.5 hover:rotate-0 rotate-[-1deg]">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-richblack-900/10">
              <div className="w-12 h-12 rounded-full bg-warm-200 shrink-0 flex items-center justify-center text-richblack-900 font-bold text-sm">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-richblack-900 truncate">John Doe</p>
                <p className="text-xs text-richblack-900/50 truncate">Senior Frontend Engineer</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-200 mb-1.5">Experience</p>
                <p className="text-xs font-semibold text-richblack-900/80">Northwind Labs — Frontend Engineer</p>
                <p className="text-[11px] text-richblack-900/50 mt-1 leading-relaxed">
                  Led a checkout redesign that lifted conversion by 18% across 2M+ monthly sessions.
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-200 mb-1.5">Education</p>
                <p className="text-xs font-semibold text-richblack-900/80">B.Tech, Computer Science</p>
                <p className="text-[11px] text-richblack-900/50 mt-1">National Institute of Technology</p>
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
          <div data-hero-badge2 className="absolute -bottom-6 -right-4 rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl px-5 py-4 flex items-center gap-3">
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
