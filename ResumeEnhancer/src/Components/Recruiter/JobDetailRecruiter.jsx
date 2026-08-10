import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaUsers, FaCopy, FaCheckCircle, FaPlus, FaLock } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import { GetJob, PublishJob, CloseJob } from '../../Services/operations/Job'

const statusBadge = {
  draft: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  published: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  closed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

// the recruiter's own view of one job sir — status, the attached test (or a prompt to attach
// one), and the doorway into that job's applicants list
const JobDetailRecruiter = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { currentJob: job, loading } = useSelector((state) => state.job)
  const [copied, setCopied] = useState(false)
  const { isLocked } = useRecruiterLock()

  useEffect(() => {
    dispatch(GetJob(jobId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handlePublish = async () => {
    const ok = await dispatch(PublishJob(jobId, token))
    if (ok) dispatch(GetJob(jobId, token))
  }

  const handleClose = async () => {
    await dispatch(CloseJob(jobId, token))
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/Jobs/${jobId}`)
    toast.success("Public job link copied")
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading || !job) {
    return (
      <RecruiterLayout>
        <Loading text="Loading the job..." />
      </RecruiterLayout>
    )
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>{job.title} | Resumify Recruiter</title>
      </Helmet>

      <div className="max-w-3xl space-y-6">
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-xl text-richblack-5">{job.title}</h1>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[job.status]}`}>
                  {job.status}
                </span>
              </div>
              <p className="text-sm text-warm-200">{job.companyName}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {job.status === 'draft' && (
                <span title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
                  <IconBtn
                    text="Publish"
                    onclick={handlePublish}
                    customClasses="text-sm px-4 py-2"
                    disabled={!job.test || isLocked}
                  >
                    {isLocked && <FaLock />}
                  </IconBtn>
                </span>
              )}
              {job.status === 'published' && (
                <>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                  >
                    {copied ? <FaCheckCircle className="text-caribgreen-100" /> : <FaCopy />}
                    {copied ? 'Copied' : 'Copy public link'}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={isLocked}
                    title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-pink-700 text-pink-100 text-xs font-semibold hover:bg-pink-700/20 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLocked && <FaLock className="text-[10px]" />} Close job
                  </button>
                </>
              )}
              <Link
                to={`/Recruiter/Jobs/${jobId}/applicants`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
              >
                <FaUsers /> Applicants
              </Link>
            </div>
          </div>

          {job.status === 'draft' && !job.test && (
            <p className="text-xs text-yellow-25 mb-3">
              Attach a proctored test before you can publish this job.
            </p>
          )}

          <p className="text-sm text-richblack-200 whitespace-pre-wrap">{job.description}</p>
        </div>

        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="text-sm font-semibold text-richblack-5 mb-3">Proctored Test</h2>
          {job.test ? (
            <p className="text-sm text-richblack-300">
              A test is attached to this job. Manage its questions from the applicants list once
              candidates start applying, or revisit it while it's still a draft.
            </p>
          ) : (
            <div>
              <p className="text-sm text-richblack-300 mb-4">No test attached yet.</p>
              <span title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
                <IconBtn
                  text="Attach a test"
                  onclick={() => navigate(`/Recruiter/Jobs/${jobId}/Test`)}
                  customClasses="text-sm px-4 py-2"
                  disabled={isLocked}
                >
                  {isLocked ? <FaLock /> : <FaPlus />}
                </IconBtn>
              </span>
            </div>
          )}
        </div>
      </div>
    </RecruiterLayout>
  )
}

export default JobDetailRecruiter
