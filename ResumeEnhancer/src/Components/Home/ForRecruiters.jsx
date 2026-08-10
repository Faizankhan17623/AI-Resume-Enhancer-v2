import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import toast from 'react-hot-toast'
import { FaBriefcase, FaShieldAlt, FaChartLine, FaCheckCircle, FaClock } from 'react-icons/fa'
import Navbar from './Navbar'
import Footer from './Footer'
import IconBtn from '../extra/IconBtn'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { ApplyForRecruiter } from '../../Services/operations/User'

const VALUE_PROPS = [
  { icon: FaBriefcase, title: 'Post real jobs', desc: 'Publish a job listing candidates can find and apply to directly on the platform.' },
  { icon: FaShieldAlt, title: 'Proctored screening', desc: 'Attach a webcam-monitored, marks-based test to every job — no more fake take-homes.' },
  { icon: FaChartLine, title: 'Marks-based scoring', desc: 'Set your own total marks and weight each question — final scores match how you actually grade.' },
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

  const existingApplication = user?.recruiterApplication

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

    setSubmitting(true)
    const ok = await dispatch(ApplyForRecruiter({
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      companySize,
      location: location.trim(),
      hiringNeeds: hiringNeeds.trim(),
    }, token))
    setSubmitting(false)
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full"
      >
        <div className="text-center mb-14">
          <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
            FOR RECRUITERS
          </span>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-richblack-5 tracking-tight">
            Hire with <span className="text-warm-200">confidence</span>
          </h1>
          <p className="mt-3 text-richblack-200 text-lg max-w-xl mx-auto">
            Post jobs, screen candidates with proctored tests, and grade them your way — with real marks, not a guess.
          </p>
        </div>

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
              <h2 className="font-display text-lg text-richblack-5 mb-1">Apply for recruiter access</h2>
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
                  text={submitting ? "Submitting..." : (isLoggedIn ? "Submit application" : "Log in to apply")}
                  disabled={submitting}
                  customClasses="w-full justify-center"
                />
              </form>
            </>
          )}
        </div>
      </motion.div>

      <Footer />
    </div>
  )
}

export default ForRecruiters
