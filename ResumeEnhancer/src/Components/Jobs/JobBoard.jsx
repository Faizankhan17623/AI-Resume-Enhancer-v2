import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaSearch, FaMapMarkerAlt, FaBriefcase } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Footer from '../Home/Footer'
import Loading from '../extra/Loading'
import { staggerContainer, fadeUp } from '../../utils/motion'
import { GetPublicJobs } from '../../Services/operations/Job'
import { formatJobDate } from '../../utils/formatDate'

const EMPLOYMENT_TYPES = ['', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']

// the public job board sir — deliberately NOT the same as /Dashboard/Job-Search (the private
// Tavily web-search feature). This lists real jobs posted by recruiters on this site.
const JobBoard = () => {
  const dispatch = useDispatch()
  const { publicJobs, publicJobsPagination, loading } = useSelector((state) => state.job)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(GetPublicJobs({ page, search, location, employmentType }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, employmentType])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    dispatch(GetPublicJobs({ page: 1, search, location, employmentType }))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>Jobs | Resumify</title>
      </Helmet>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full"
      >
        <div className="text-center mb-10">
          <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
            JOBS
          </span>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-richblack-5 tracking-tight">
            Find your <span className="text-warm-200">next role</span>
          </h1>
          <p className="mt-3 text-richblack-200 text-lg">Proctored-screened jobs posted directly by recruiters.</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-10">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-richblack-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Job title, company, or skill..."
              className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-10 pr-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-richblack-400 text-sm" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-10 pr-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
          <select
            value={employmentType}
            onChange={(e) => { setEmploymentType(e.target.value); setPage(1) }}
            className="rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-2.5 text-sm text-richblack-5 cursor-pointer focus:outline-none focus:border-yellow-50 transition-colors duration-200"
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t || 'All types'}</option>
            ))}
          </select>
          <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-yellow-50 text-richblack-900 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer">
            Search
          </button>
        </form>

        {loading ? (
          <Loading text="Loading jobs..." />
        ) : publicJobs.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center flex flex-col items-center">
            <p className="text-richblack-200">There's no job for you with us right now.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="space-y-4">
            {publicJobs.map((job) => (
              <motion.div key={job._id} variants={fadeUp}>
                <Link
                  to={`/Jobs/${job._id}`}
                  className="block rounded-xl bg-richblack-800 border border-richblack-700 p-6 hover:border-yellow-50/50 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-richblack-5">{job.title}</h3>
                      <p className="text-sm text-warm-200 mt-0.5">{job.companyName}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-richblack-300 flex-wrap">
                        {job.location && (
                          <span className="flex items-center gap-1.5"><FaMapMarkerAlt /> {job.location}</span>
                        )}
                        {job.employmentType && (
                          <span className="flex items-center gap-1.5"><FaBriefcase /> {job.employmentType}</span>
                        )}
                        {job.createdAt && <span className="text-richblack-400">Posted {formatJobDate(job.createdAt)}</span>}
                      </div>
                      {job.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.skills.slice(0, 6).map((skill) => (
                            <span key={skill} className="px-2.5 py-1 text-[11px] rounded-full bg-richblack-700 text-richblack-200 border border-richblack-600">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {publicJobsPagination.pages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-richblack-300 font-mono">{page} / {publicJobsPagination.pages}</span>
            <button
              disabled={page >= publicJobsPagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </motion.div>

      <Footer />
    </div>
  )
}

export default JobBoard
