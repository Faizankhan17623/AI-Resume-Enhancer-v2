import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaExclamationTriangle, FaPaperPlane, FaLock, FaCheck, FaTimes, FaBolt, FaMagic, FaArrowLeft, FaIdCard, FaBookmark, FaRegBookmark, FaFileAlt } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import ResumeViewerModal from './ResumeViewerModal'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import {
  GetJobApplicants, InviteApplicantToTest, SetApplicationOutcome,
  BulkInviteApplicantsToTest, BulkSetApplicationOutcome, ToggleShortlist,
} from '../../Services/operations/Job'
import { GenerateCandidateSummary } from '../../Services/operations/RecruiterAi'

const statusBadge = {
  applied: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  invited_to_test: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  completed_test: 'bg-blue-700/30 text-blue-100 border-blue-700',
  // reuses the warm palette sir — not quite "rejected" (pink, a recruiter's own decision) and not
  // "applied" (neutral) either; a distinct "this expired on its own" signal
  invite_expired: 'bg-warm-700/30 text-warm-25 border-warm-600',
  rejected: 'bg-pink-700/30 text-pink-100 border-pink-700',
  hired: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
}

const statusLabel = {
  applied: 'Applied',
  invited_to_test: 'Invited to test',
  completed_test: 'Test completed',
  invite_expired: 'Invite expired',
  rejected: 'Rejected',
  hired: 'Hired',
}

// a worst-to-best gradient across colors already in this app's palette sir (no purple token
// exists here) — richblack (neutral/low) through warm (mid) to caribgreen (best), reading as its
// own distinct signal from the status badges above rather than reusing blue/pink for a different meaning
const fitTierMeta = {
  not_a_fit: { label: 'Not a fit', className: 'bg-richblack-700 text-richblack-300 border-richblack-600' },
  can_get_it_done: { label: 'Can get it done', className: 'bg-warm-700/30 text-warm-25 border-warm-600' },
  hireable: { label: 'Hireable', className: 'bg-warm-200/20 text-warm-25 border-warm-200' },
  best_fit: { label: 'Best fit', className: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700' },
}

const FIT_FILTER_OPTIONS = [
  { value: '', label: 'All fit scores' },
  { value: 'best_fit', label: 'Best fit (76-100)' },
  { value: 'hireable', label: 'Hireable (51-75)' },
  { value: 'can_get_it_done', label: 'Can get it done (26-50)' },
  { value: 'not_a_fit', label: 'Not a fit (0-25)' },
  { value: 'unscored', label: 'Not yet scored' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'invited_to_test', label: 'Invited to test' },
  { value: 'completed_test', label: 'Test completed' },
  { value: 'invite_expired', label: 'Invite expired' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

// month/year only sir — the structured apply form only ever collects a month+year for
// education/work-history date ranges, so a full utcDateToIstDisplay timestamp (built for
// precise UTC->IST moments like violation logs) would be misleadingly precise here
const formatMonthYear = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// replaces the old standalone AttemptsList sir — applicants are queried by JOB now, not by
// test. "Invite to test" is the gate that actually lets THAT candidate start the test (see
// controllers/Test.js's startAttempt); once they've completed it, the row links through to the
// existing AttemptDetail.jsx (unchanged) for the full violation/answers review.
const JobApplicantsList = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { jobApplicants, jobHasTest, testPublished, loading } = useSelector((state) => state.job)
  const { isLocked } = useRecruiterLock()
  const [selected, setSelected] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [fitFilter, setFitFilter] = useState('')
  // "flag for later" sir, per direct request — a recruiter reviewing many applicants shouldn't
  // be forced to decide hire/reject on first pass. Client-side filter, same convention as
  // statusFilter/fitFilter above.
  const [shortlistedOnly, setShortlistedOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('Working...')
  // which applicant's Candidate Detail panel is open sir — one at a time, per direct request
  // ("a button... when we close the button it will open a section... x to close")
  const [expandedId, setExpandedId] = useState(null)
  // index into rankedApplicants sir — null means the resume viewer modal is closed. Per direct
  // request: cycling through resumes one at a time instead of one PDF link per tab.
  const [viewerIndex, setViewerIndex] = useState(null)
  const withBusy = (label) => (next) => {
    if (next) setBusyLabel(label)
    setBusy(next)
  }

  useEffect(() => {
    dispatch(GetJobApplicants(jobId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleInvite = (applicationId) => {
    dispatch(InviteApplicantToTest(applicationId, jobId, token, withBusy('Inviting...')))
  }

  const handleOutcome = (applicationId, status) => {
    dispatch(SetApplicationOutcome(applicationId, status, token, withBusy(status === 'hired' ? 'Marking as hired...' : 'Rejecting...')))
  }

  // no busy overlay sir — a quick icon toggle, not worth a full-screen loader for
  const handleToggleShortlist = (applicationId) => {
    dispatch(ToggleShortlist(applicationId, token))
  }

  // Pro/ProMax upsell sir — on-demand re-request of the AI candidate summary (the automatic one
  // already ran once at apply time). A full refetch is simplest here since this is a low-
  // frequency, one-off action, not worth a bespoke local-patch reducer for.
  const handleRegenerateSummary = async (applicationId) => {
    const summary = await dispatch(GenerateCandidateSummary(applicationId, token, withBusy('Summarizing...')))
    if (summary) dispatch(GetJobApplicants(jobId, token))
  }

  const toggleSelected = (applicationId) => {
    setSelected((prev) => prev.includes(applicationId) ? prev.filter((id) => id !== applicationId) : [...prev, applicationId])
  }

  // filtered view sir — the filter bar lets a recruiter narrow down WHO'S selectable before
  // picking a subset to bulk-invite/hire/reject, per direct request
  const filteredApplicants = useMemo(() => {
    return jobApplicants.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false
      if (fitFilter === 'unscored' && a.fitTier) return false
      if (fitFilter && fitFilter !== 'unscored' && a.fitTier !== fitFilter) return false
      if (shortlistedOnly && !a.shortlisted) return false
      return true
    })
  }, [jobApplicants, statusFilter, fitFilter, shortlistedOnly])

  // hiring straight from 'applied' is only valid when this job has NO test at all sir (Part 4a —
  // tests are optional now); when it has one, hiring still requires 'completed_test'.
  // 'invite_expired' is invite-eligible (same as 'applied') but deliberately NOT hire-eligible —
  // an expired invite was never even started, let alone completed, so hiring from it makes no sense.
  const selectableApplied = filteredApplicants.filter((a) => a.status === 'applied').map((a) => a._id)
  const selectableExpiredInvite = filteredApplicants.filter((a) => a.status === 'invite_expired').map((a) => a._id)
  const selectableForInvite = [...selectableApplied, ...selectableExpiredInvite]
  const selectableCompleted = filteredApplicants.filter((a) => a.status === 'completed_test').map((a) => a._id)
  const selectableForHire = jobHasTest ? selectableCompleted : [...selectableApplied, ...selectableCompleted]
  const allSelectableIds = [...selectableForInvite, ...selectableCompleted]
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.includes(id))

  const toggleSelectAll = () => {
    setSelected(allSelected ? [] : allSelectableIds)
  }

  const handleBulkInvite = async () => {
    const ids = selected.filter((id) => selectableForInvite.includes(id))
    if (ids.length === 0) return
    await dispatch(BulkInviteApplicantsToTest(ids, jobId, token, withBusy('Inviting candidates...')))
    setSelected([])
  }

  // 'hired' still needs the completed_test/no-test-applied eligibility rule sir; 'rejected' (the
  // manual "close this application" action) works from ANY selected row, any status
  const handleBulkOutcome = async (status) => {
    const ids = status === 'rejected' ? selected : selected.filter((id) => selectableForHire.includes(id))
    if (ids.length === 0) return
    await dispatch(BulkSetApplicationOutcome(ids, status, jobId, token, withBusy(status === 'hired' ? 'Marking as hired...' : 'Rejecting...')))
    setSelected([])
  }

  // rank by AI fit score first sir (the signal available the moment someone applies, before any
  // test), then by test score once one exists — a recruiter opening this page sees the
  // strongest-looking candidates up top even for jobs with no test stage at all.
  const scored = filteredApplicants.filter((a) => typeof a.fitScore === 'number')
  const unscored = filteredApplicants.filter((a) => typeof a.fitScore !== 'number')
  scored.sort((a, b) => b.fitScore - a.fitScore)
  const rankedApplicants = [...scored, ...unscored]

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Applicants | Resumify Recruiter</title>
      </Helmet>

      <AnimatePresence>
      {busy && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text={busyLabel} size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <Link
        to={`/Recruiter/Jobs/${jobId}`}
        className="inline-flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer mb-4"
      >
        <FaArrowLeft className="text-xs" /> Back to job
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="font-display text-xl text-richblack-5">Applicants</h1>
        {rankedApplicants.some((a) => a.resumeUrl) && (
          <button
            onClick={() => setViewerIndex(0)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer"
          >
            <FaFileAlt className="text-xs" /> View top resumes
          </button>
        )}
      </div>

      {viewerIndex !== null && (
        <ResumeViewerModal
          applicants={rankedApplicants}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {jobHasTest && !testPublished && !loading && (
        <div className="mb-6 rounded-xl bg-pink-700/10 border border-pink-700 px-5 py-4 flex items-start gap-3">
          <FaExclamationTriangle className="text-pink-100 mt-0.5 shrink-0" />
          <p className="text-sm text-pink-100">
            This job's test is still a draft — <strong>publish it from the test builder</strong> before
            you can invite candidates. Inviting to an unpublished test used to silently mark
            candidates as invited without ever emailing them a link; that's now blocked.
          </p>
        </div>
      )}

      {loading ? (
        <Loading text="Loading applicants..." />
      ) : jobApplicants.length === 0 ? (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
          <p className="text-richblack-300 text-sm">No one has applied to this job yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* filter bar sir — narrows down who's even selectable before a bulk action, per
              direct request ("a filter option ... from there he can select to whom we should
              send the test link") */}
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-richblack-800 border border-richblack-600 text-richblack-100 text-xs px-3 py-2 focus:outline-none focus:border-yellow-50 cursor-pointer"
            >
              {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={fitFilter}
              onChange={(e) => setFitFilter(e.target.value)}
              className="rounded-lg bg-richblack-800 border border-richblack-600 text-richblack-100 text-xs px-3 py-2 focus:outline-none focus:border-yellow-50 cursor-pointer"
            >
              {FIT_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => setShortlistedOnly((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border text-xs px-3 py-2 cursor-pointer transition-colors duration-200 ${
                shortlistedOnly
                  ? 'bg-yellow-700/20 text-yellow-25 border-yellow-700'
                  : 'bg-richblack-800 border-richblack-600 text-richblack-100 hover:border-richblack-400'
              }`}
            >
              {shortlistedOnly ? <FaBookmark className="text-[10px]" /> : <FaRegBookmark className="text-[10px]" />} Shortlisted only
            </button>
            {(statusFilter || fitFilter || shortlistedOnly) && (
              <button
                onClick={() => { setStatusFilter(''); setFitFilter(''); setShortlistedOnly(false) }}
                className="text-xs text-richblack-400 hover:text-richblack-5 cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          {allSelectableIds.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-richblack-300 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-yellow-50 cursor-pointer" />
              Select all actionable applicants
            </label>
          )}

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-3" title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
              <span className="text-sm text-richblack-100 font-medium">{selected.length} selected</span>
              {jobHasTest && selected.some((id) => selectableForInvite.includes(id)) && (
                <button
                  onClick={handleBulkInvite}
                  disabled={isLocked || !testPublished}
                  title={!testPublished ? "Publish this job's test before inviting candidates to it" : undefined}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-700/20 text-yellow-25 border border-yellow-700 hover:bg-yellow-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invite selected to test
                </button>
              )}
              {selected.some((id) => selectableForHire.includes(id)) && (
                <button
                  onClick={() => handleBulkOutcome('hired')}
                  disabled={isLocked}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-caribgreen-700/20 text-caribgreen-25 border border-caribgreen-700 hover:bg-caribgreen-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hire selected
                </button>
              )}
              {/* reject/close works from ANY selected status sir — the manual "close this
                  application" action, per direct request */}
              <button
                onClick={() => handleBulkOutcome('rejected')}
                disabled={isLocked}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-700/20 text-pink-100 border border-pink-700 hover:bg-pink-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject selected
              </button>
              <button
                onClick={() => setSelected([])}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {scored.length > 0 && (
            <p className="text-xs text-richblack-400 uppercase tracking-wide font-semibold">
              Ranked by AI fit score
            </p>
          )}
          {rankedApplicants.map((app, index) => {
            const fitMeta = app.fitTier ? fitTierMeta[app.fitTier] : null
            // hiring is only reachable from 'applied' when the job has NO test at all sir
            // (Part 4a) — otherwise it still needs 'completed_test'
            const canHire = jobHasTest ? app.status === 'completed_test' : app.status === 'applied'
            return (
              <div key={app._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
                {index === scored.length && scored.length > 0 && unscored.length > 0 && (
                  <p className="text-xs text-richblack-400 uppercase tracking-wide font-semibold mb-4 -mt-1">
                    Not yet scored
                  </p>
                )}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex items-start gap-3">
                    {allSelectableIds.includes(app._id) && (
                      <input
                        type="checkbox"
                        checked={selected.includes(app._id)}
                        onChange={() => toggleSelected(app._id)}
                        className="shrink-0 mt-1 accent-yellow-50 cursor-pointer"
                      />
                    )}
                    {index < scored.length && (
                      <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-richblack-700 border border-richblack-600 text-richblack-200 text-[11px] font-bold flex items-center justify-center">
                        #{index + 1}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-richblack-5 font-semibold truncate">
                        {app.candidate ? `${app.candidate.firstName} ${app.candidate.lastName}` : 'Deleted candidate'}
                      </p>
                      <p className="text-xs text-richblack-400 truncate">{app.candidate?.email}</p>
                      {app.resumeUrl && (
                        <button
                          onClick={() => setViewerIndex(index)}
                          className="text-xs text-yellow-50 hover:underline mt-0.5 cursor-pointer"
                        >
                          View resume
                        </button>
                      )}
                      {app.fitScoreReasoning && (
                        <p className="text-xs text-richblack-500 mt-1 max-w-md">{app.fitScoreReasoning}</p>
                      )}
                      {!app.fitTier && app.fitScoreSkippedReason && (
                        <p className="text-[11px] text-richblack-500 mt-1 italic">{app.fitScoreSkippedReason}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-richblack-100 hover:text-yellow-50 cursor-pointer"
                        >
                          <FaIdCard className="text-[9px]" /> Candidate detail
                        </button>
                        {app.resumeUrl && (
                          <button
                            onClick={() => handleRegenerateSummary(app._id)}
                            className="flex items-center gap-1 text-[11px] text-richblack-400 hover:text-yellow-50 cursor-pointer"
                          >
                            <FaMagic className="text-[9px]" /> {app.fitScoreReasoning ? 'Regenerate' : 'Generate'} AI summary
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {app.testAttempt?.violationCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-yellow-25">
                        <FaExclamationTriangle /> {app.testAttempt.violationCount}
                      </span>
                    )}
                    {app.testAttempt?.score !== null && app.testAttempt?.score !== undefined && (
                      <span className="flex items-center gap-1.5 text-sm" title={app.testAttempt.test?.totalMarks ? `${app.testAttempt.score} marks scored out of ${app.testAttempt.test.totalMarks} total marks` : undefined}>
                        <span className="font-display text-yellow-50">
                          {app.testAttempt.score}{app.testAttempt.test?.totalMarks ? `/${app.testAttempt.test.totalMarks}` : ''}
                        </span>
                        {app.testAttempt.test?.totalMarks && (
                          <span className="text-[11px] text-richblack-400">
                            ({app.testAttempt.score} marks gotten, {app.testAttempt.test.totalMarks} total marks)
                          </span>
                        )}
                      </span>
                    )}
                    {fitMeta && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${fitMeta.className}`}>
                        <FaBolt className="text-[9px]" /> {fitMeta.label} ({app.fitScore})
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[app.status]}`}>
                      {statusLabel[app.status] || app.status}
                    </span>
                    <button
                      onClick={() => handleToggleShortlist(app._id)}
                      title={app.shortlisted ? 'Remove from shortlist' : 'Shortlist for later'}
                      className={`p-1.5 rounded-full cursor-pointer transition-colors duration-200 ${
                        app.shortlisted ? 'text-yellow-25 hover:text-yellow-50' : 'text-richblack-500 hover:text-richblack-200'
                      }`}
                    >
                      {app.shortlisted ? <FaBookmark className="text-xs" /> : <FaRegBookmark className="text-xs" />}
                    </button>
                    {jobHasTest && ['applied', 'invite_expired'].includes(app.status) && (
                      <span title={isLocked
                        ? 'Locked until an admin approves your recruiter account'
                        : !testPublished
                          ? "Publish this job's test before inviting candidates to it"
                          : undefined}>
                        <IconBtn
                          text={app.status === 'invite_expired' ? 'Re-invite to test' : 'Invite to test'}
                          onclick={() => handleInvite(app._id)}
                          customClasses="text-xs px-3 py-2"
                          disabled={isLocked || !testPublished}
                        >
                          {isLocked ? <FaLock className="text-[10px]" /> : <FaPaperPlane className="text-[10px]" />}
                        </IconBtn>
                      </span>
                    )}
                    {app.testAttempt && ['invited_to_test', 'completed_test'].includes(app.status) && (
                      <Link
                        to={`/Recruiter/Attempts/${app.testAttempt._id}`}
                        className="px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                      >
                        View attempt
                      </Link>
                    )}
                    <span className="flex items-center gap-2" title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
                      {canHire && (
                        <button
                          onClick={() => handleOutcome(app._id, 'hired')}
                          disabled={isLocked}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-caribgreen-700 text-caribgreen-100 text-xs font-semibold hover:bg-caribgreen-700/20 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaCheck className="text-[10px]" /> Hire
                        </button>
                      )}
                      {/* always visible, any status sir — the manual "close this application"
                          action requested directly, not gated on test completion */}
                      {!['rejected', 'hired'].includes(app.status) && (
                        <button
                          onClick={() => handleOutcome(app._id, 'rejected')}
                          disabled={isLocked}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-pink-700 text-pink-100 text-xs font-semibold hover:bg-pink-700/20 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaTimes className="text-[10px]" /> Rejected
                        </button>
                      )}
                    </span>
                  </div>
                </div>

                {/* Candidate detail sir — the structured apply-form data (experience level,
                    address, salary, education/work history) already comes back from
                    getJobApplicants but was never shown anywhere; this surfaces it on demand
                    instead of cluttering the row by default. One panel open at a time. */}
                <AnimatePresence>
                  {expandedId === app._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-richblack-700 relative">
                        <button
                          onClick={() => setExpandedId(null)}
                          className="absolute top-0 right-0 text-richblack-400 hover:text-richblack-5 cursor-pointer p-1"
                          aria-label="Close candidate detail"
                        >
                          <FaTimes />
                        </button>

                        <h3 className="text-sm font-semibold text-richblack-5 mb-3 pr-8">Candidate detail</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                          <div>
                            <p className="text-richblack-400 uppercase tracking-wide font-semibold mb-0.5">Experience level</p>
                            <p className="text-richblack-100 capitalize">{app.experienceLevel || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-richblack-400 uppercase tracking-wide font-semibold mb-0.5">Expected salary</p>
                            <p className="text-richblack-100">{app.expectedSalary ? `₹${app.expectedSalary.toLocaleString('en-IN')}` : 'Not provided'}</p>
                          </div>

                          {app.experienceLevel === 'experienced' && (
                            <div>
                              <p className="text-richblack-400 uppercase tracking-wide font-semibold mb-0.5">Current CTC</p>
                              <p className="text-richblack-100">{app.currentCtc ? `₹${app.currentCtc.toLocaleString('en-IN')}` : 'Not provided'}</p>
                            </div>
                          )}

                          <div className="sm:col-span-2">
                            <p className="text-richblack-400 uppercase tracking-wide font-semibold mb-0.5">Address</p>
                            <p className="text-richblack-100">
                              {app.address?.line || app.address?.city || app.address?.state || app.address?.pincode
                                ? [app.address.line, app.address.city, app.address.state, app.address.pincode].filter(Boolean).join(', ')
                                : 'Not provided'}
                            </p>
                          </div>

                          {app.experienceLevel === 'fresher' && (
                            <div className="sm:col-span-2">
                              <p className="text-richblack-400 uppercase tracking-wide font-semibold mb-1">Education</p>
                              {app.education?.length > 0 ? (
                                <div className="space-y-1.5">
                                  {app.education.map((edu, i) => (
                                    <p key={i} className="text-richblack-100">
                                      <span className="capitalize font-medium">{edu.degree}</span>
                                      {edu.institution ? ` — ${edu.institution}` : ''}
                                      {' '}({formatMonthYear(edu.startDate)} – {edu.currentlyStudying ? 'Present' : formatMonthYear(edu.endDate)})
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-richblack-100">Not provided</p>
                              )}
                            </div>
                          )}

                          {app.experienceLevel === 'experienced' && (
                            <div className="sm:col-span-2">
                              <p className="text-richblack-400 uppercase tracking-wide font-semibold mb-1">Work history</p>
                              {app.workHistory?.length > 0 ? (
                                <div className="space-y-1.5">
                                  {app.workHistory.map((job, i) => (
                                    <p key={i} className="text-richblack-100">
                                      <span className="font-medium">{job.companyName}</span>
                                      {' '}({formatMonthYear(job.startDate)} – {job.currentlyWorking ? 'Present' : formatMonthYear(job.endDate)})
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-richblack-100">Not provided</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </RecruiterLayout>
  )
}

export default JobApplicantsList
