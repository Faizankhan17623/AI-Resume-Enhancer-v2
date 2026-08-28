import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import { FaLock, FaMagic } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import { CreateJob } from '../../Services/operations/Job'
import { GetProfile } from '../../Services/operations/User'
import { GenerateJobDescription } from '../../Services/operations/RecruiterAi'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']

const JobBuilder = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { profile } = useSelector((state) => state.profile)
  const [companyNameOverride, setCompanyNameOverride] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [employmentType, setEmploymentType] = useState('Full-time')
  const [skillsInput, setSkillsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mustHaves, setMustHaves] = useState('')
  const [draftingAi, setDraftingAi] = useState(false)
  const { isLocked } = useRecruiterLock()

  useEffect(() => {
    dispatch(GetProfile(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // defaults the job's company name to what the recruiter gave at signup/approval sir —
  // only while the recruiter hasn't typed their own value, so it doesn't clobber an edit
  const recruiterCompanyName = profile?.user?.recruiterApplication?.companyName || ''
  const companyName = companyNameOverride ?? recruiterCompanyName

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLocked) return toast.error("Your recruiter account is pending admin approval")
    if (!companyName.trim()) return toast.error("Please enter your company name")
    if (!title.trim()) return toast.error("Please give the job a title")
    if (!description.trim()) return toast.error("Please add a job description")

    const payload = {
      companyName: companyName.trim(),
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      employmentType,
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
    }

    const job = await dispatch(CreateJob(payload, token, navigate, setSubmitting))
    if (!job) return
  }

  // Pro/ProMax upsell sir — drafts the description from a title + a few must-have bullet points,
  // metered by utils/RecruiterPlans.js's recruiterJdWritesUsed
  const handleDraftWithAi = async () => {
    if (!title.trim()) return toast.error("Enter a job title first")
    if (!mustHaves.trim()) return toast.error("Give the AI a few must-have requirements to work from")

    const drafted = await dispatch(GenerateJobDescription(title.trim(), employmentType, mustHaves.trim(), token, setDraftingAi))
    if (drafted) setDescription(drafted)
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>New Job | Resumify Recruiter</title>
      </Helmet>

      <AnimatePresence>
      {(submitting || draftingAi) && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text={draftingAi ? "Drafting the description..." : "Creating the job..."} size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Post a Job</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Company name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyNameOverride(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
            {recruiterCompanyName && (
              <p className="text-[11px] text-richblack-400 mt-1.5">
                Defaults to your account's company name — edit it if this job is for a different brand.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Job title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend Engineer"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
          <div className="rounded-xl border border-richblack-600 p-4 space-y-3">
            <label className="block text-xs font-semibold text-richblack-200">Draft with AI (optional)</label>
            <textarea
              value={mustHaves}
              onChange={(e) => setMustHaves(e.target.value)}
              rows={2}
              placeholder="A few must-have requirements, e.g. 3+ years React, remote-friendly, mid-level"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
            />
            <button
              type="button"
              onClick={handleDraftWithAi}
              disabled={draftingAi}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-yellow-50 text-richblack-900 hover:brightness-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaMagic className="text-[10px]" /> Draft description with AI
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Role, responsibilities, requirements..."
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, Bengaluru"
                className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Employment type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Skills (comma-separated)</label>
            <input
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. React, Node.js, MongoDB"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
        </div>

        <p className="text-xs text-richblack-400">
          You can optionally attach a proctored test after creating the job — jobs can be
          published either way. You'll add compensation details on the next screen before publishing.
        </p>

        {isLocked && (
          <p className="flex items-center gap-2 text-xs text-yellow-25">
            <FaLock /> Locked until an admin approves your recruiter account
          </p>
        )}
        <IconBtn type="submit" text="Create job" disabled={submitting || isLocked} customClasses="w-full justify-center" />
      </form>
    </RecruiterLayout>
  )
}

export default JobBuilder
