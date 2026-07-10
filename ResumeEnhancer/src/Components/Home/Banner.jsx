import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowRight, FaFilePdf, FaRobot, FaChartLine } from 'react-icons/fa'
import IconBtn from '../extra/IconBtn'
import ScoreRing from '../extra/ScoreRing'

const Banner = () => {
  const { token } = useSelector((state) => state.auth)

  const steps = [
    { icon: <FaFilePdf className="text-2xl text-pink-200" />, title: 'Upload your resume', desc: 'Drop your PDF and paste the job description you are targeting.' },
    { icon: <FaRobot className="text-2xl text-blue-100" />, title: 'AI reads it like an ATS', desc: 'Keyword match, section scores, red flags — everything a real scanner sees.' },
    { icon: <FaChartLine className="text-2xl text-caribgreen-100" />, title: 'Fix, rescore, improve', desc: 'Before/after rewrites, then watch your score climb review after review.' },
  ]

  return (
    <div className="w-full bg-richblack-900">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center justify-between gap-14 animate-fadeIn">

        {/* Left Side - the pitch sir */}
        <div className="w-full lg:w-[55%] flex flex-col items-start">
          <span className="mb-5 px-4 py-1.5 text-xs font-bold rounded-full bg-richblack-800 text-yellow-50 border border-richblack-700">
            AI-POWERED ATS RESUME REVIEWER
          </span>

          <h1 className="text-5xl lg:text-6xl font-extrabold text-richblack-5 tracking-tight leading-tight">
            Beat the <span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">ATS.</span>
            <br />
            Land the <span className="bg-gradient-to-r from-blue-50 to-caribgreen-50 bg-clip-text text-transparent">interview.</span>
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
              <button className="px-6 py-3 text-base font-semibold text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                See pricing
              </button>
            </Link>
          </div>
        </div>

        {/* Right Side - the score demo card sir */}
        <div className="w-full lg:w-[40%] flex justify-center">
          <div className="relative w-full max-w-sm rounded-2xl bg-richblack-800 border border-richblack-700 p-8 shadow-2xl hover:-translate-y-1 transition-transform duration-300">
            <p className="text-sm font-semibold text-richblack-200 mb-6 text-center">Your ATS Score</p>
            <div className="flex justify-center">
              <ScoreRing score={87} />
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-richblack-200">Keyword Match</span>
                <span className="text-caribgreen-100 font-bold font-mono">91</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-richblack-200">Experience Relevance</span>
                <span className="text-caribgreen-100 font-bold font-mono">85</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-richblack-200">Skills Coverage</span>
                <span className="text-yellow-50 font-bold font-mono">68</span>
              </div>
            </div>
            <div className="mt-6 w-full h-1 bg-gradient-to-r from-yellow-50 via-caribgreen-100 to-blue-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* How it works sir */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="rounded-xl bg-richblack-800 border border-richblack-700 p-6 hover:border-richblack-500 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-richblack-700 flex items-center justify-center mb-4">
                {step.icon}
              </div>
              <h3 className="text-richblack-5 font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-richblack-300 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Banner
