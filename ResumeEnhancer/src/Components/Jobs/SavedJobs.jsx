import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaMapMarkerAlt, FaBriefcase, FaArrowLeft, FaBookmark, FaRupeeSign, FaClock } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Footer from '../Home/Footer'
import Loading from '../extra/Loading'
import { staggerContainer, fadeUp } from '../../utils/motion'
import { GetSavedJobs, ToggleSavedJob } from '../../Services/operations/Job'

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
        <FaClock /> Unpaid
      </span>
    )
  }
  return null
}

const statusBadge = {
  draft: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  published: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  closed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

// the User's own bookmarked jobs sir, per direct request — see Models/User.js's savedJobs field
const SavedJobs = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoggedIn, token } = useSelector((state) => state.auth)
  const { savedJobs, loading } = useSelector((state) => state.job)

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/Login', { state: { from: '/Jobs/Saved' } })
      return
    }
    dispatch(GetSavedJobs(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  const handleRemove = (e, jobId) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(ToggleSavedJob(jobId, token))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Saved Jobs | Resumify</title>
      </Helmet>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full"
      >
        <Link to="/Jobs" className="inline-flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 transition-colors duration-200 mb-6">
          <FaArrowLeft /> Back to jobs
        </Link>

        <h1 className="font-display font-bold text-3xl text-richblack-5 mb-8">Saved Jobs</h1>

        {loading ? (
          <Loading text="Loading your saved jobs..." />
        ) : savedJobs.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center flex flex-col items-center">
            <FaBookmark className="text-2xl text-richblack-500 mb-3" />
            <p className="text-richblack-200">You haven't saved any jobs yet.</p>
            <Link to="/Jobs" className="mt-4 text-sm text-yellow-50 hover:underline">Browse the job board</Link>
          </div>
        ) : (
          <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="space-y-4">
            {savedJobs.map((job) => (
              <motion.div key={job._id} variants={fadeUp}>
                <Link
                  to={`/Jobs/${job._id}`}
                  className="block rounded-xl bg-richblack-800 border border-richblack-700 p-6 hover:border-yellow-50/50 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-richblack-5">{job.title}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border shrink-0 ${statusBadge[job.status]}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm text-warm-200 mt-0.5">{job.companyName}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-richblack-300 flex-wrap">
                        {job.location && (
                          <span className="flex items-center gap-1.5"><FaMapMarkerAlt /> {job.location}</span>
                        )}
                        {job.employmentType && (
                          <span className="flex items-center gap-1.5"><FaBriefcase /> {job.employmentType}</span>
                        )}
                        <CompensationLine job={job} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, job._id)}
                      title="Remove from saved jobs"
                      className="text-yellow-50 hover:text-richblack-300 transition-colors duration-200 cursor-pointer shrink-0"
                    >
                      <FaBookmark />
                    </button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <Footer />
    </div>
  )
}

export default SavedJobs
