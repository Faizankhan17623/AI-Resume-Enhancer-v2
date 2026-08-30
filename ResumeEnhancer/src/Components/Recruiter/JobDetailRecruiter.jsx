import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { FaUsers, FaCopy, FaCheckCircle, FaPlus, FaLock, FaChartBar, FaTrash, FaArrowLeft } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import { GetJob, PublishJob, CloseJob, UpdateJob, DeleteJob } from '../../Services/operations/Job'
import { PublishTest } from '../../Services/operations/Test'
import { swalDark } from '../../utils/accountShared'

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

  const [compensationType, setCompensationType] = useState('')
  const [ctcMin, setCtcMin] = useState('')
  const [ctcMax, setCtcMax] = useState('')
  const [unpaidDurationMonths, setUnpaidDurationMonths] = useState('')
  const [certificateProvided, setCertificateProvided] = useState(false)
  const [savingComp, setSavingComp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('Working...')
  const withBusy = (label) => (next) => {
    if (next) setBusyLabel(label)
    setBusy(next)
  }

  useEffect(() => {
    dispatch(GetJob(jobId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // seed the compensation form from the job once it loads sir — only while the recruiter hasn't
  // started editing (mirrors JobBuilder.jsx's companyNameOverride pattern), so a background
  // refetch after publish doesn't clobber an in-progress edit. Deliberately keyed on job?._id
  // rather than job itself — widening this to satisfy exhaustive-deps would re-run the seed on
  // every refetch of the SAME job (e.g. after handlePublish's own GetJob call below) and clobber
  // whatever the recruiter is mid-editing, which is exactly what this narrow key exists to avoid.
  useEffect(() => {
    if (!job) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompensationType(job.compensationType || '')
    setCtcMin(job.ctcMin ?? '')
    setCtcMax(job.ctcMax ?? '')
    setUnpaidDurationMonths(job.unpaidDurationMonths ?? '')
    setCertificateProvided(!!job.certificateProvided)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?._id])

  const handlePublish = async () => {
    const ok = await dispatch(PublishJob(jobId, token, withBusy('Publishing...')))
    if (ok) dispatch(GetJob(jobId, token))
  }

  const handleClose = async () => {
    await dispatch(CloseJob(jobId, token, withBusy('Closing the job...')))
  }

  // a test attached to a job is still its OWN separate document with its own draft/published
  // state sir — publishing the JOB never publishes its test (they're independent on purpose,
  // since a test can be edited further after the job itself already went live). Without a
  // Publish action reachable from here, a recruiter had to already know to visit the unrelated
  // "My Tests" page to find it — this button, plus the populated job.test status below, closes
  // that gap directly on the page the recruiter naturally lands on after creating the test.
  const handlePublishTest = async () => {
    await dispatch(PublishTest(job.test._id, token, withBusy('Publishing the test...')))
    dispatch(GetJob(jobId, token))
  }

  const handleCopyTestLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/Test/${job.test.inviteCode}`)
    toast.success("Test invite link copied")
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/Jobs/${jobId}`)
    toast.success("Public job link copied")
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSaveCompensation = async () => {
    if (!compensationType) return toast.error("Pick paid or unpaid")
    if (compensationType === 'paid' && (!ctcMin || !ctcMax)) return toast.error("Enter both a minimum and maximum CTC")
    if (compensationType === 'unpaid' && !unpaidDurationMonths) return toast.error("Enter the internship/unpaid duration")

    await dispatch(UpdateJob(jobId, {
      compensationType,
      ctcMin: compensationType === 'paid' ? Number(ctcMin) : undefined,
      ctcMax: compensationType === 'paid' ? Number(ctcMax) : undefined,
      unpaidDurationMonths: compensationType === 'unpaid' ? Number(unpaidDurationMonths) : undefined,
      certificateProvided: compensationType === 'unpaid' ? certificateProvided : undefined,
    }, token, setSavingComp))
  }

  // a mistake sir, per direct request — deletes the job outright, every applicant gets an email
  // (see controllers/Job.js's deleteJob)
  const handleDelete = () => {
    Swal.fire({
      ...swalDark,
      title: 'Delete this job posting?',
      html: 'This cannot be undone. Every candidate who applied will be emailed that the posting was withdrawn.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete job',
      confirmButtonColor: '#C1443C',
    }).then((result) => {
      if (result.isConfirmed) dispatch(DeleteJob(jobId, token, navigate, withBusy('Deleting the job...')))
    })
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

      <AnimatePresence>
      {(busy || savingComp) && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text={savingComp ? "Saving compensation..." : busyLabel} size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <div className="max-w-3xl space-y-6">
        {/* no way back to My Jobs before this sir, per direct request */}
        <Link
          to="/Recruiter"
          className="inline-flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
        >
          <FaArrowLeft className="text-xs" /> Back to My Jobs
        </Link>

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
                    disabled={!job.compensationType || isLocked}
                  >
                    {isLocked && <FaLock />}
                  </IconBtn>
                </span>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-pink-700 text-pink-100 text-xs font-semibold hover:bg-pink-700/20 transition-colors duration-200 cursor-pointer"
              >
                <FaTrash className="text-[10px]" /> Delete
              </button>
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
              <Link
                to={`/Recruiter/Jobs/${jobId}/analytics`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
              >
                <FaChartBar /> Analytics
              </Link>
            </div>
          </div>

          {job.status === 'draft' && !job.compensationType && (
            <p className="text-xs text-yellow-25 mb-3">
              Add compensation details below before you can publish this job.
            </p>
          )}

          <p className="text-sm text-richblack-200 whitespace-pre-wrap">{job.description}</p>
        </div>

        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="text-sm font-semibold text-richblack-5 mb-3">Compensation</h2>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setCompensationType('paid')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors duration-200 cursor-pointer ${
                compensationType === 'paid' ? 'bg-yellow-50 text-richblack-900 border-yellow-50' : 'border-richblack-600 text-richblack-200 hover:border-richblack-400'
              }`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setCompensationType('unpaid')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors duration-200 cursor-pointer ${
                compensationType === 'unpaid' ? 'bg-yellow-50 text-richblack-900 border-yellow-50' : 'border-richblack-600 text-richblack-200 hover:border-richblack-400'
              }`}
            >
              Unpaid
            </button>
          </div>

          {compensationType === 'paid' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Minimum CTC</label>
                <input type="number" min="0" value={ctcMin} onChange={(e) => setCtcMin(e.target.value)} placeholder="e.g. 450000" className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Maximum CTC</label>
                <input type="number" min="0" value={ctcMax} onChange={(e) => setCtcMax(e.target.value)} placeholder="e.g. 880000" className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200" />
              </div>
            </div>
          )}

          {compensationType === 'unpaid' && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Duration (months)</label>
                <input type="number" min="0" value={unpaidDurationMonths} onChange={(e) => setUnpaidDurationMonths(e.target.value)} placeholder="e.g. 3" className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200" />
              </div>
              <label className="flex items-center gap-2 text-sm text-richblack-200 cursor-pointer">
                <input type="checkbox" checked={certificateProvided} onChange={(e) => setCertificateProvided(e.target.checked)} />
                A completion certificate will be issued
              </label>
            </div>
          )}

          {compensationType && (
            <IconBtn text="Save compensation" onclick={handleSaveCompensation} disabled={savingComp} customClasses="text-sm" />
          )}
        </div>

        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="text-sm font-semibold text-richblack-5 mb-3">Proctored Test</h2>
          <p className="text-xs text-richblack-400 mb-3">
            Optional — a job can be published with or without a test. Without one, review
            applicants straight from their application and AI fit score.
          </p>
          {job.test ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                  job.test.status === 'published'
                    ? 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700'
                    : 'bg-richblack-700 text-richblack-200 border-richblack-600'
                }`}>
                  {job.test.status}
                </span>
                <span className="text-sm text-richblack-300 truncate">{job.test.title}</span>
              </div>

              {job.test.status === 'draft' ? (
                <div>
                  <p className="text-sm text-pink-100 mb-3">
                    This test is still a draft — candidates can't be invited to it until you publish it.
                  </p>
                  <span title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
                    <IconBtn
                      text="Publish this test"
                      onclick={handlePublishTest}
                      customClasses="text-sm px-4 py-2"
                      disabled={isLocked}
                    />
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-richblack-300 mb-3">
                    Manage its questions from the applicants list once candidates start applying.
                  </p>
                  {job.test.inviteCode && (
                    <button
                      onClick={handleCopyTestLink}
                      className="px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                    >
                      <FaCopy className="inline mr-1.5" /> Copy invite link
                    </button>
                  )}
                </div>
              )}
            </div>
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
