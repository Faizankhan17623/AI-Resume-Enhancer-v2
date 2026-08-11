import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaMapMarkerAlt, FaBriefcase, FaArrowLeft } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Footer from '../Home/Footer'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { GetPublicJob, ApplyToJob } from '../../Services/operations/Job'
import { GetResumes } from '../../Services/operations/Resume'

const JobDetail = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoggedIn, token } = useSelector((state) => state.auth)
  const { currentPublicJob: job, loading } = useSelector((state) => state.job)
  const { resumes } = useSelector((state) => state.resume)
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    dispatch(GetPublicJob(jobId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  useEffect(() => {
    if (isLoggedIn) dispatch(GetResumes(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  const defaultResumeId = resumes.length > 0
    ? (resumes.find((r) => r.isDefault) || resumes[0])._id
    : ''
  const effectiveResumeId = selectedResumeId || defaultResumeId

  const handleApply = async () => {
    if (!isLoggedIn) {
      navigate('/Login', { state: { from: `/Jobs/${jobId}` } })
      return
    }
    setApplying(true)
    const applyPayload = effectiveResumeId ? { resume: effectiveResumeId } : {}
    const success = await dispatch(ApplyToJob(jobId, token, applyPayload))
    setApplying(false)
    if (success) navigate('/Dashboard/My-Applications')
  }

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-richblack-900 flex flex-col">
        <Navbar />
        <Loading text="Loading the job..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>{job.title} at {job.companyName} | Resumify</title>
      </Helmet>
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <Link to="/Jobs" className="inline-flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 transition-colors duration-200 mb-6">
          <FaArrowLeft /> Back to jobs
        </Link>

        <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-8">
          <h1 className="font-display text-2xl text-richblack-5">{job.title}</h1>
          <p className="text-warm-200 mt-1">{job.companyName}</p>

          <div className="flex items-center gap-4 mt-4 text-sm text-richblack-300 flex-wrap">
            {job.location && <span className="flex items-center gap-1.5"><FaMapMarkerAlt /> {job.location}</span>}
            {job.employmentType && <span className="flex items-center gap-1.5"><FaBriefcase /> {job.employmentType}</span>}
          </div>

          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {job.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 text-[11px] rounded-full bg-richblack-700 text-richblack-200 border border-richblack-600">
                  {skill}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-richblack-200 whitespace-pre-wrap mt-6 leading-relaxed">{job.description}</p>

          <div className="mt-8">
            {isLoggedIn && resumes.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs text-richblack-300 mb-1.5">Apply with</label>
                <select
                  value={effectiveResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full sm:w-auto min-w-[240px] bg-richblack-700 border border-richblack-600 text-richblack-5 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-yellow-50"
                >
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.label || r.originalFilename}{r.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isLoggedIn && resumes.length === 0 && (
              <p className="text-xs text-yellow-25 mb-4">
                You don't have a saved resume yet — you can still apply, or{' '}
                <Link to="/Dashboard/Resumes" className="underline hover:text-yellow-5">save one first</Link>{' '}
                so recruiters can see it.
              </p>
            )}
            <IconBtn text="Apply" onclick={handleApply} loading={applying} customClasses="w-full justify-center sm:w-auto" />
            <p className="text-xs text-richblack-400 mt-3">
              Applying is the first step — the recruiter will invite you to a short proctored
              screening test if they'd like to move forward.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default JobDetail
