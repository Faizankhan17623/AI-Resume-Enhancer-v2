import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaExternalLinkAlt, FaCrown, FaBriefcase } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { SearchJobs } from '../../Services/operations/JobSearch'

const JobSearch = () => {
  const [query, setQuery] = useState('')
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { jobs, lastQuery, searching } = useSelector((state) => state.jobSearch)

  const isBasic = !user?.SubType || user.SubType === 'Basic'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    dispatch(SearchJobs(query.trim(), token))
  }

  return (
    <DashboardLayout title="Job search">
      <Helmet>
        <title>Job Search | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8">

        {isBasic ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <FaCrown className="text-3xl text-yellow-50 mx-auto mb-4" />
            <p className="text-richblack-100 mb-2 font-semibold">Job search is a Pro feature</p>
            <p className="text-richblack-300 text-sm mb-6">Upgrade your plan to search the live web for job openings that match what you're looking for.</p>
            <Link to="/Pricing" className="inline-block">
              <IconBtn text="View plans" />
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 md:p-8 mb-6">
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">What job are you looking for?</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Frontend React developer remote India"
                  className="flex-1 rounded-xl bg-richblack-700 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                />
                <IconBtn type="submit" text="Search jobs" customClasses="px-8 py-3 text-sm whitespace-nowrap" />
              </div>
            </form>

            {searching ? (
              <Loading text="Searching the web for matching jobs — give it a few seconds..." />
            ) : jobs.length > 0 ? (
              <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="space-y-4">
                <p className="text-xs text-richblack-400">
                  Showing results for <span className="text-richblack-100 font-semibold">"{lastQuery}"</span>
                </p>
                {jobs.map((job, idx) => (
                  <motion.a
                    key={idx}
                    variants={fadeUp}
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-richblack-800 border border-richblack-700 p-5 hover:border-yellow-50/60 transition-colors duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-richblack-5 text-sm mb-1.5 group-hover:text-yellow-50 transition-colors duration-200">
                          {job.title}
                        </h3>
                        <p className="text-xs text-richblack-300 leading-relaxed line-clamp-3">{job.snippet}</p>
                        <p className="text-[11px] text-richblack-400 mt-2 truncate">{job.url}</p>
                      </div>
                      <FaExternalLinkAlt className="text-richblack-400 group-hover:text-yellow-50 transition-colors duration-200 shrink-0 mt-1" />
                    </div>
                  </motion.a>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center">
                <FaBriefcase className="text-3xl text-richblack-400 mx-auto mb-4" />
                <p className="text-richblack-100 font-semibold mb-1">Search for your next role</p>
                <p className="text-richblack-400 text-sm">Describe the job, location, or company you're targeting above.</p>
              </div>
            )}
          </>
        )}
      </PageTransition>
    </DashboardLayout>
  )
}

export default JobSearch
