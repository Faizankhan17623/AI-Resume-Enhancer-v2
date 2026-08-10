import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import { CreateJob } from '../../Services/operations/Job'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']

const JobBuilder = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const [companyName, setCompanyName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [employmentType, setEmploymentType] = useState('Full-time')
  const [skillsInput, setSkillsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
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

    setSubmitting(true)
    const job = await dispatch(CreateJob(payload, token, navigate))
    setSubmitting(false)
    if (!job) return
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>New Job | Resumify Recruiter</title>
      </Helmet>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Post a Job</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Company name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
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
          After creating the job, you'll attach a proctored test to it — the job can't be
          published until a test is attached.
        </p>

        <IconBtn type="submit" text={submitting ? "Creating..." : "Create job"} disabled={submitting} customClasses="w-full justify-center" />
      </form>
    </RecruiterLayout>
  )
}

export default JobBuilder
