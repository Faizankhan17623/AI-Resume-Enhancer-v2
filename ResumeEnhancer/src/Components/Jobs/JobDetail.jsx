import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaMapMarkerAlt, FaBriefcase, FaArrowLeft, FaRupeeSign, FaClock } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Footer from '../Home/Footer'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import ApplyModal from './ApplyModal'
import { GetPublicJob } from '../../Services/operations/Job'
import { formatJobDate } from '../../utils/formatDate'

const CompensationLine = ({ job }) => {
  if (job.compensationType === 'paid') {
    return (
      <span className="flex items-center gap-1.5 text-caribgreen-100 font-semibold">
        <FaRupeeSign /> {(job.ctcMin / 100000).toFixed(1)}L - {(job.ctcMax / 100000).toFixed(1)}L per year
      </span>
    )
  }
  if (job.compensationType === 'unpaid') {
    return (
      <span className="flex items-center gap-1.5 text-richblack-300">
        <FaClock /> Unpaid{job.unpaidDurationMonths ? ` • ${job.unpaidDurationMonths} month${job.unpaidDurationMonths === 1 ? '' : 's'}` : ''}
        {job.certificateProvided ? ' • Certificate on completion' : ''}
      </span>
    )
  }
  return null
}

const JobDetail = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoggedIn } = useSelector((state) => state.auth)
  const { currentPublicJob: job, loading } = useSelector((state) => state.job)
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    dispatch(GetPublicJob(jobId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      navigate('/Login', { state: { from: `/Jobs/${jobId}` } })
      return
    }
    setApplyOpen(true)
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
            <CompensationLine job={job} />
            {job.createdAt && <span className="text-richblack-400">Posted {formatJobDate(job.createdAt)}</span>}
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
            <IconBtn text="Apply" onclick={handleApplyClick} customClasses="w-full justify-center sm:w-auto" />
            <p className="text-xs text-richblack-400 mt-3">
              Applying takes a couple of minutes — we'll ask a few quick questions and a resume
              upload. The recruiter may invite you to a short proctored test afterward.
            </p>
          </div>
        </div>
      </div>

      <Footer />

      {applyOpen && (
        <ApplyModal
          jobId={jobId}
          onClose={() => setApplyOpen(false)}
          onSuccess={() => {
            setApplyOpen(false)
            navigate('/Dashboard/My-Applications')
          }}
        />
      )}
    </div>
  )
}

export default JobDetail
