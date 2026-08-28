import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaBriefcase, FaShieldAlt, FaChartLine, FaCheckCircle, FaClock, FaUserPlus, FaBolt, FaUsers, FaFileContract, FaPenNib, FaUserCheck, FaClipboardList, FaHandshake, FaBalanceScale, FaEye, FaHeart } from 'react-icons/fa'
import Navbar from './Navbar'
import Footer from './Footer'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { ApplyForRecruiter } from '../../Services/operations/User'

const VALUE_PROPS = [
  { icon: FaBriefcase, title: 'Post real jobs', desc: 'Publish a job listing candidates can find and apply to directly on the platform.' },
  { icon: FaShieldAlt, title: 'Proctored screening', desc: 'Attach a webcam-monitored, marks-based test to every job — no more fake take-homes.' },
  { icon: FaChartLine, title: 'Marks-based scoring', desc: 'Set your own total marks and weight each question — final scores match how you actually grade.' },
]

// the two ways in sir — brand new to Resumify vs. already have a candidate account and want to
// add recruiting to it. Shown above the fold so nobody mistakes the apply form below for a
// generic lead-capture form; it's specifically the second path.
const PATHS = [
  { icon: FaUserPlus, title: "New to Resumify?", desc: 'Create a Recruiter account directly — pick "Hire talent" on signup and fill in your company details once.', cta: 'Sign up as a recruiter', to: '/Signup' },
  { icon: FaBolt, title: 'Already have an account?', desc: "Keep your existing login and apply below to add recruiting access to it — no need for a second account.", cta: 'Apply below', anchor: true },
]

const STATS = [
  { icon: FaUsers, value: '5', label: 'AI-powered resume reviews baked into every candidate signup' },
  { icon: FaShieldAlt, value: '100%', label: 'Webcam-proctored — every test attempt is monitored, not just trusted' },
  { icon: FaFileContract, value: 'Manual', label: 'Every recruiter account is reviewed by a real admin before it goes live' },
]

// the real product flow sir, described honestly — not a generic "post/screen/hire" template.
// Each step maps to an actual screen: JobBuilder -> the public /Jobs board -> TestBuilder +
// ProctoredTestRunner -> JobAnalytics/hire-reject flow (see Recruiter/* components).
const PROCESS_STEPS = [
  { icon: FaPenNib, title: 'Post the role', desc: "Write the listing once — title, description, requirements. It goes live on Resumify's public job board the moment you publish it." },
  { icon: FaUserCheck, title: 'Candidates apply', desc: 'Anyone browsing the board can apply directly, resume attached — no email threads, no spreadsheet to maintain.' },
  { icon: FaClipboardList, title: 'Proctor the test', desc: 'Invite applicants to a webcam-monitored test you built yourself, graded on the marks you set — not a generic aptitude quiz.' },
  { icon: FaHandshake, title: 'Decide with real numbers', desc: 'Review scored attempts side by side in your analytics view, then mark each candidate hired or rejected — the outcome is recorded, not guessed.' },
]

// grounded in what the product actually enforces sir, not generic "we value X" copy — every
// line here maps to a real backend rule (see Backend/Middlewares/Auth.js's isApprovedRecruiter,
// the proctoring flags on ProctoredTestRunner, and the marks-based grading in TestBuilder).
const PRINCIPLES = [
  { icon: FaEye, title: 'No unverified employers', desc: "Every recruiter account is reviewed by a person before it can post a single job. Candidates never face a listing from a company nobody has checked." },
  { icon: FaBalanceScale, title: 'Grading you control', desc: "You set the total marks and the weight of every question up front. The score a candidate ends with is the score you designed, not a black-box algorithm's guess." },
  { icon: FaHeart, title: "Candidates' time respected", desc: "Every applicant gets free AI resume tools on this platform regardless of whether you hire them — Resumify isn't just a funnel into your job posting." },
]

const statusCopy = {
  pending: { title: "You're under review", body: "We've received your application and an admin will review it shortly. You'll be able to post jobs the moment it's approved.", tone: 'text-yellow-25 bg-yellow-700/20 border-yellow-700' },
  approved: { title: "You're approved!", body: 'Your recruiter account is active — head to your dashboard to post your first job.', tone: 'text-caribgreen-100 bg-caribgreen-700/20 border-caribgreen-700' },
  rejected: { title: 'Application not approved', body: 'Your recruiter application was not approved this time. You can apply again with updated details.', tone: 'text-pink-100 bg-pink-700/20 border-pink-700' },
}

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

// a required-field label sir — the red asterisk. Every field on this form is required, the
// Admin's approval judgment call (Admin/RecruiterApplications.jsx) depends on having all of it.
const RequiredLabel = ({ children }) => (
  <label className="block text-xs font-semibold text-richblack-200 mb-1.5">
    {children} <span className="text-pink-200">*</span>
  </label>
)

// the recruiter marketing surface sir — value prop + self-signup form. Approval is manual
// (see Admin/RecruiterApplications.jsx), this page only ever submits the request.
const ForRecruiters = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoggedIn, token, user } = useSelector((state) => state.auth)
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [location, setLocation] = useState('')
  const [hiringNeeds, setHiringNeeds] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const applySectionRef = useRef(null)

  const existingApplication = user?.recruiterApplication

  // "Apply below" reveal sir — scroll to the section first, then run a brief loader
  // before the actual form animates in, so it reads as something being fetched/prepared
  // rather than a plain accordion toggle.
  const handleApplyClick = () => {
    applySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (showApplyForm) return
    setApplyLoading(true)
    setTimeout(() => {
      setApplyLoading(false)
      setShowApplyForm(true)
    }, 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) {
      navigate('/Login', { state: { from: '/For-Recruiters' } })
      return
    }
    if (!companyName.trim()) return toast.error("Please enter your company name")
    if (!companyWebsite.trim()) return toast.error("Please enter your company website")
    if (!/^https?:\/\/.+\..+/i.test(companyWebsite.trim())) return toast.error("Please enter a valid website URL (e.g. https://example.com)")
    if (!companySize) return toast.error("Please select your company size")
    if (!location.trim()) return toast.error("Please enter your company location")
    if (!hiringNeeds.trim()) return toast.error("Please tell us your hiring needs")

    const ok = await dispatch(ApplyForRecruiter({
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      companySize,
      location: location.trim(),
      hiringNeeds: hiringNeeds.trim(),
    }, token, setSubmitting))
    if (ok) {
      setCompanyName('')
      setCompanyWebsite('')
      setCompanySize('')
      setLocation('')
      setHiringNeeds('')
    }
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>For Recruiters | Resumify</title>
      </Helmet>
      <Navbar />

      <AnimatePresence>
      {submitting && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text="Submitting your application..." size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      {/* Hero sir — deliberately more of a full landing feel now: badge, headline, then
          an immediate fork so nobody has to read the whole page to know which button is theirs */}
      <div className="relative overflow-hidden border-b border-richblack-800">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/10 via-transparent to-transparent pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-5xl mx-auto px-6 pt-16 pb-14 w-full text-center"
        >
          <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
            FOR RECRUITERS
          </span>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-richblack-5 tracking-tight">
            Hire with <span className="text-warm-200">confidence</span>
          </h1>
          <p className="mt-3 text-richblack-200 text-lg max-w-xl mx-auto">
            Post jobs, screen candidates with proctored tests, and grade them your way — with real marks, not a guess.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full"
      >
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {VALUE_PROPS.map((prop) => (
            <motion.div key={prop.title} variants={fadeUp} className="rounded-xl bg-richblack-800 border border-richblack-700 p-6">
              <div className="w-11 h-11 rounded-full bg-yellow-900/15 flex items-center justify-center mb-4">
                <prop.icon className="text-yellow-50" />
              </div>
              <h3 className="text-richblack-5 font-semibold mb-1.5">{prop.title}</h3>
              <p className="text-sm text-richblack-300">{prop.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* trust/stats strip sir — social-proof-shaped, but honest about what this app
            actually is (no fake customer logos/counts) */}
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16 rounded-2xl bg-richblack-800/60 border border-richblack-700 p-8"
        >
          {STATS.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <stat.icon className="text-warm-200" />
                <span className="font-display text-2xl text-richblack-5">{stat.value}</span>
              </div>
              <p className="text-xs text-richblack-400 leading-relaxed">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* how hiring actually works here sir — a real 4-step walkthrough of the product,
            not a generic "post/screen/hire" marketing template */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block mb-3 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
              HOW IT WORKS
            </span>
            <h2 className="font-display font-bold text-2xl lg:text-3xl text-richblack-5 tracking-tight">
              From job post to <span className="text-warm-200">hired</span>, in one place
            </h2>
          </div>
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {PROCESS_STEPS.map((step, i) => (
              <motion.div key={step.title} variants={fadeUp} className="relative rounded-2xl bg-richblack-800 border border-richblack-700 p-6">
                <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-warm-200 text-richblack-900 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="w-11 h-11 rounded-full bg-yellow-900/15 flex items-center justify-center mb-4">
                  <step.icon className="text-yellow-50" />
                </div>
                <h3 className="text-richblack-5 font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm text-richblack-300 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* principles sir — grounded in rules the product actually enforces, not empty
            "we value X" copy. See PRINCIPLES above for what each one maps to in the backend. */}
        <div className="mb-16 rounded-2xl bg-gradient-to-br from-richblack-800 to-richblack-800/60 border border-richblack-700 p-8 lg:p-10">
          <div className="text-center mb-10">
            <span className="inline-block mb-3 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-900 text-warm-200 border border-richblack-700">
              WHAT WE WON'T COMPROMISE ON
            </span>
            <h2 className="font-display font-bold text-2xl lg:text-3xl text-richblack-5 tracking-tight">
              Hiring done <span className="text-warm-200">honestly</span>
            </h2>
            <p className="mt-3 text-richblack-300 max-w-xl mx-auto">
              A hiring tool is only as trustworthy as the rules it enforces on both sides. Here's what's non-negotiable on Resumify.
            </p>
          </div>
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {PRINCIPLES.map((principle) => (
              <motion.div key={principle.title} variants={fadeUp} className="text-center md:text-left">
                <div className="w-11 h-11 rounded-full bg-yellow-900/15 flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <principle.icon className="text-yellow-50" />
                </div>
                <h3 className="text-richblack-5 font-semibold mb-1.5">{principle.title}</h3>
                <p className="text-sm text-richblack-300 leading-relaxed">{principle.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* the fork sir — new account vs. upgrade an existing one, now placed right after the
            principles section. "Apply below" no longer jumps straight to a form — it scrolls
            here, runs a brief loader, then reveals the form below in an animated way */}
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16"
        >
          {PATHS.map((path) => (
            <motion.div key={path.title} variants={fadeUp} className="rounded-2xl bg-richblack-800 border border-richblack-700 p-7 flex flex-col">
              <div className="w-11 h-11 rounded-full bg-yellow-900/15 flex items-center justify-center mb-4">
                <path.icon className="text-yellow-50" />
              </div>
              <h3 className="text-richblack-5 font-semibold text-lg mb-1.5">{path.title}</h3>
              <p className="text-sm text-richblack-300 mb-5 flex-1">{path.desc}</p>
              {path.anchor ? (
                <button type="button" onClick={handleApplyClick} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer">
                  {path.cta}
                </button>
              ) : (
                <Link to={path.to} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200">
                  {path.cta}
                </Link>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div id="apply" ref={applySectionRef} className="scroll-mt-24">
          <AnimatePresence mode="wait">
            {applyLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg mx-auto rounded-2xl bg-richblack-800 border border-richblack-700 p-8 flex flex-col items-center justify-center gap-4 min-h-[220px]"
              >
                <span className="w-10 h-10 rounded-full border-2 border-richblack-600 border-t-yellow-50 animate-spin" />
                <p className="text-sm text-richblack-300">Preparing your application form…</p>
              </motion.div>
            ) : showApplyForm ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="text-center mb-6">
                  <h2 className="font-display text-2xl text-richblack-5">Apply for recruiter access</h2>
                  <p className="text-sm text-richblack-300 mt-1.5 max-w-md mx-auto">
                    This upgrades your existing Resumify login to a Recruiter account — you'll keep signing in exactly as you do now.
                  </p>
                </div>
                <div className="max-w-lg mx-auto rounded-2xl bg-richblack-800 border border-richblack-700 p-8">
                  {isLoggedIn && user?.role === 'Recruiter' ? (
                    <div className="text-center">
                      <FaCheckCircle className="text-3xl text-caribgreen-100 mx-auto mb-3" />
                      <p className="text-richblack-5 font-semibold mb-4">You're already a Recruiter</p>
                      <IconBtn text="Go to your dashboard" onclick={() => navigate('/Recruiter')} customClasses="w-full justify-center" />
                    </div>
                  ) : isLoggedIn && existingApplication?.status && existingApplication.status !== 'rejected' ? (
                    <div className={`rounded-xl border p-5 text-center ${statusCopy[existingApplication.status]?.tone}`}>
                      <div className="flex items-center justify-center gap-2 mb-2 font-semibold">
                        <FaClock /> {statusCopy[existingApplication.status]?.title}
                      </div>
                      <p className="text-sm opacity-90">{statusCopy[existingApplication.status]?.body}</p>
                    </div>
                  ) : (
                    <>
                      {!isLoggedIn && (
                        <div className="rounded-lg border border-blue-700 bg-blue-700/10 p-3 mb-5 text-xs text-blue-25">
                          You'll need to log in first — this form adds recruiting access to your existing account, it doesn't create a new one.
                        </div>
                      )}
                      <p className="text-sm text-richblack-300 mb-6">
                        We verify each request based on company name and brand — approval isn't automatic.
                      </p>

                      {isLoggedIn && existingApplication?.status === 'rejected' && (
                        <div className="rounded-lg border border-pink-700 bg-pink-700/10 p-3 mb-5 text-xs text-pink-100">
                          Your previous application wasn't approved{existingApplication.rejectionReason ? `: ${existingApplication.rejectionReason}` : '.'} You can apply again below.
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <RequiredLabel>Company name</RequiredLabel>
                          <input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            required
                            className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                          />
                        </div>
                        <div>
                          <RequiredLabel>Company website</RequiredLabel>
                          <input
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            placeholder="https://..."
                            required
                            className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <RequiredLabel>Company size</RequiredLabel>
                            <select
                              value={companySize}
                              onChange={(e) => setCompanySize(e.target.value)}
                              required
                              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                            >
                              <option value="" disabled>Select size</option>
                              {COMPANY_SIZES.map((size) => (
                                <option key={size} value={size}>{size} employees</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <RequiredLabel>Location</RequiredLabel>
                            <input
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g. Bengaluru, India"
                              required
                              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                            />
                          </div>
                        </div>
                        <div>
                          <RequiredLabel>Hiring needs</RequiredLabel>
                          <textarea
                            value={hiringNeeds}
                            onChange={(e) => setHiringNeeds(e.target.value)}
                            rows={4}
                            placeholder="What roles are you hiring for?"
                            required
                            className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
                          />
                        </div>
                        <IconBtn
                          type="submit"
                          text={isLoggedIn ? "Submit application" : "Log in to apply"}
                          disabled={submitting}
                          customClasses="w-full justify-center"
                        />
                      </form>
                    </>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      <Footer />
    </div>
  )
}

export default ForRecruiters
