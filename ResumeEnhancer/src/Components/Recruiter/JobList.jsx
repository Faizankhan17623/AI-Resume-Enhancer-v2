import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaPlus, FaUsers, FaLock } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import { GetMyJobs } from '../../Services/operations/Job'

const statusBadge = {
  draft: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  published: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  closed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

// the recruiter's top-level landing page sir — Jobs, not standalone Tests. A Test now lives
// inside a Job (see JobBuilder.jsx → attach a test), reached from here.
const JobList = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { myJobs, loading } = useSelector((state) => state.job)
  const { isLocked } = useRecruiterLock()

  useEffect(() => {
    dispatch(GetMyJobs(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RecruiterLayout>
      <Helmet>
        <title>My Jobs | Resumify Recruiter</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-richblack-5">My Jobs</h1>
        {isLocked ? (
          <span title="Locked until an admin approves your recruiter account">
            <IconBtn text="New Job" disabled><FaLock /></IconBtn>
          </span>
        ) : (
          <Link to="/Recruiter/New">
            <IconBtn text="New Job"><FaPlus /></IconBtn>
          </Link>
        )}
      </div>

      {loading ? (
        <Loading text="Loading your jobs..." />
      ) : myJobs.length === 0 ? (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
          <p className="text-richblack-100 mb-2 font-semibold">No jobs yet</p>
          <p className="text-richblack-300 text-sm mb-6">Post a job, attach a proctored test, and start screening candidates.</p>
          {isLocked ? (
            <span title="Locked until an admin approves your recruiter account" className="inline-block">
              <IconBtn text="Post your first job" disabled><FaLock /></IconBtn>
            </span>
          ) : (
            <Link to="/Recruiter/New" className="inline-block">
              <IconBtn text="Post your first job"><FaPlus /></IconBtn>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {myJobs.map((job) => (
            <Link
              key={job._id}
              to={`/Recruiter/Jobs/${job._id}`}
              className="block rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5 hover:bg-richblack-700/60 transition-colors duration-200"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-richblack-5 font-semibold truncate">{job.title}</h3>
                    <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[job.status]}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-richblack-400">
                    {job.companyName}{job.location ? ` · ${job.location}` : ''}{!job.test ? ' · no test attached yet' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold">
                  <FaUsers /> Applicants
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </RecruiterLayout>
  )
}

export default JobList
