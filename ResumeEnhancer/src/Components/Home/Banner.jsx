import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowRight, FaFilePdf, FaRobot, FaChartLine, FaCheckCircle } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'

const Banner = () => {
  const { token } = useSelector((state) => state.auth)

  const steps = [
    { icon: <FaFilePdf className="text-2xl text-pink-200" />, title: 'Upload your resume', desc: 'Drop your PDF and paste the job description you are targeting.' },
    { icon: <FaRobot className="text-2xl text-blue-100" />, title: 'AI reads it like an ATS', desc: 'Keyword match, section scores, red flags — everything a real scanner sees.' },
    { icon: <FaChartLine className="text-2xl text-caribgreen-100" />, title: 'Fix, rescore, improve', desc: 'Before/after rewrites, then watch your score climb review after review.' },
  ]

  return (
    <div className="relative w-full bg-richblack-900 overflow-hidden">
      {/* soft blurred accent shapes sir — warm-editorial hero decoration, low opacity so text stays crisp */}
      <div className="pointer-events-none absolute -top-24 right-[-60px] w-[420px] h-[420px] rounded-full bg-yellow-900/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-80px] left-[8%] w-[280px] h-[280px] rounded-full bg-warm-900/30 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center justify-between gap-14 animate-fadeIn">

        {/* Left Side - the pitch sir */}
        <div className="w-full lg:w-[55%] flex flex-col items-start">
          <span className="mb-5 px-4 py-1.5 text-xs font-bold rounded-full bg-richblack-800 text-yellow-50 border border-richblack-700">
            AI-POWERED ATS RESUME REVIEWER
          </span>

          <h1 className="font-display text-5xl lg:text-6xl text-richblack-5 tracking-tight leading-tight">
            Land more <span className="italic text-warm-200">interviews</span>
            <br />
            with the Resume <span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">Enhancer.</span>
          </h1>

          <p className="mt-6 text-richblack-200 text-lg max-w-xl leading-relaxed">
            75% of resumes are rejected by software before a human ever reads them.
            Upload yours, paste the job description, and get an honest ATS score with
            line-by-line fixes — in seconds.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link to={token ? "/Dashboard/New-Review" : "/Signup"}>
              <IconBtn text={token ? "Analyze my resume" : "Start free — 5 reviews"} customClasses="text-base px-6 py-3">
                <FaArrowRight />
              </IconBtn>
            </Link>
            <Link to="/Pricing">
              <button className="px-6 py-3 text-base font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                See pricing
              </button>
            </Link>
          </div>
        </div>

        {/* Right Side - stylized resume mockup sir, with the ATS score badge pinned to it */}
        <div className="w-full lg:w-[40%] flex justify-center">
          <div className="relative w-full max-w-sm">
            {/* the resume "document" sir */}
            <div className="rounded-2xl bg-richblack-5 border border-richblack-700 p-7 shadow-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 pb-4 border-b-2 border-richblack-900/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-2/3 rounded-full bg-richblack-900/70" />
                  <div className="h-2 w-1/2 rounded-full bg-richblack-900/30 mt-2" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="h-2 w-24 rounded-full bg-yellow-200/70 mb-2.5" />
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-richblack-900/15" />
                    <div className="h-1.5 w-11/12 rounded-full bg-richblack-900/15" />
                    <div className="h-1.5 w-4/5 rounded-full bg-richblack-900/15" />
                  </div>
                </div>
                <div>
                  <div className="h-2 w-28 rounded-full bg-yellow-200/70 mb-2.5" />
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
            <div className="absolute -bottom-6 -right-4 rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-caribgreen-100/15 flex items-center justify-center">
                <FaCheckCircle className="text-caribgreen-100 text-lg" />
              </div>
              <div>
                <p className="text-xs text-richblack-300">ATS Score</p>
                <p className="font-display text-2xl text-caribgreen-100 leading-none mt-0.5">87</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works sir */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const borderColors = ['border-l-pink-200', 'border-l-blue-100', 'border-l-caribgreen-100']
            return (
              <div
                key={index}
                className={`rounded-xl bg-richblack-800 shadow-lg shadow-richblack-900/20 border-l-4 ${borderColors[index]} p-6 hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="w-12 h-12 rounded-lg bg-richblack-700 flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="text-richblack-5 font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-richblack-300 text-sm leading-relaxed">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Banner
