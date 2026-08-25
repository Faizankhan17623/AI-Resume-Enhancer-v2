import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaExclamationTriangle, FaPaperPlane, FaLock, FaCheck, FaTimes } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import {
  GetJobApplicants, InviteApplicantToTest, SetApplicationOutcome,
  BulkInviteApplicantsToTest, BulkSetApplicationOutcome,
} from '../../Services/operations/Job'

const statusBadge = {
  applied: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  invited_to_test: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  completed_test: 'bg-blue-700/30 text-blue-100 border-blue-700',
  rejected: 'bg-pink-700/30 text-pink-100 border-pink-700',
  hired: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
}

const statusLabel = {
  applied: 'Applied',
  invited_to_test: 'Invited to test',
  completed_test: 'Test completed',
  rejected: 'Rejected',
  hired: 'Hired',
}

// replaces the old standalone AttemptsList sir — applicants are queried by JOB now, not by
// test. "Invite to test" is the gate that actually lets THAT candidate start the test (see
// controllers/Test.js's startAttempt); once they've completed it, the row links through to the
// existing AttemptDetail.jsx (unchanged) for the full violation/answers review.
const JobApplicantsList = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { jobApplicants, loading } = useSelector((state) => state.job)
  const { isLocked } = useRecruiterLock()
  const [selected, setSelected] = useState([])

  useEffect(() => {
    dispatch(GetJobApplicants(jobId, token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleInvite = (applicationId) => {
    dispatch(InviteApplicantToTest(applicationId, jobId, token))
  }

  const handleOutcome = (applicationId, status) => {
    dispatch(SetApplicationOutcome(applicationId, status, token))
  }

  const toggleSelected = (applicationId) => {
    setSelected((prev) => prev.includes(applicationId) ? prev.filter((id) => id !== applicationId) : [...prev, applicationId])
  }

  const selectableApplied = jobApplicants.filter((a) => a.status === 'applied').map((a) => a._id)
  const selectableCompleted = jobApplicants.filter((a) => a.status === 'completed_test').map((a) => a._id)
  const allSelectableIds = [...selectableApplied, ...selectableCompleted]
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.includes(id))

  const toggleSelectAll = () => {
    setSelected(allSelected ? [] : allSelectableIds)
  }

  const handleBulkInvite = async () => {
    const ids = selected.filter((id) => selectableApplied.includes(id))
    if (ids.length === 0) return
    await dispatch(BulkInviteApplicantsToTest(ids, jobId, token))
    setSelected([])
  }

  const handleBulkOutcome = async (status) => {
    const ids = selected.filter((id) => selectableCompleted.includes(id))
    if (ids.length === 0) return
    await dispatch(BulkSetApplicationOutcome(ids, status, jobId, token))
    setSelected([])
  }

  // rank by test score sir — the only real merit signal we have. Applicants who've completed
  // the test sort highest-score-first (so a recruiter opening this page sees the strongest
  // candidates up top); everyone else (no score yet) stays grouped below, newest first, same
  // order the backend already sent them in.
  const scored = jobApplicants.filter((a) => a.testAttempt?.score !== null && a.testAttempt?.score !== undefined)
  const unscored = jobApplicants.filter((a) => !(a.testAttempt?.score !== null && a.testAttempt?.score !== undefined))
  scored.sort((a, b) => b.testAttempt.score - a.testAttempt.score)
  const rankedApplicants = [...scored, ...unscored]

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Applicants | Resumify Recruiter</title>
      </Helmet>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Applicants</h1>

      {loading ? (
        <Loading text="Loading applicants..." />
      ) : jobApplicants.length === 0 ? (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
          <p className="text-richblack-300 text-sm">No one has applied to this job yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allSelectableIds.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-richblack-300 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-yellow-50 cursor-pointer" />
              Select all actionable applicants
            </label>
          )}

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-3" title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
              <span className="text-sm text-richblack-100 font-medium">{selected.length} selected</span>
              {selected.some((id) => selectableApplied.includes(id)) && (
                <button
                  onClick={handleBulkInvite}
                  disabled={isLocked}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-700/20 text-yellow-25 border border-yellow-700 hover:bg-yellow-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invite selected to test
                </button>
              )}
              {selected.some((id) => selectableCompleted.includes(id)) && (
                <>
                  <button
                    onClick={() => handleBulkOutcome('hired')}
                    disabled={isLocked}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-caribgreen-700/20 text-caribgreen-25 border border-caribgreen-700 hover:bg-caribgreen-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hire selected
                  </button>
                  <button
                    onClick={() => handleBulkOutcome('rejected')}
                    disabled={isLocked}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-700/20 text-pink-100 border border-pink-700 hover:bg-pink-700/30 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject selected
                  </button>
                </>
              )}
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
              Ranked by test score
            </p>
          )}
          {rankedApplicants.map((app, index) => (
            <div key={app._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              {index === scored.length && scored.length > 0 && unscored.length > 0 && (
                <p className="text-xs text-richblack-400 uppercase tracking-wide font-semibold mb-4 -mt-1">
                  Not yet tested
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
                    {(app.resume || app.builtResume) && (
                      <p className="text-xs text-richblack-500 truncate mt-0.5">
                        Applied with: {app.resume?.label || app.resume?.originalFilename || app.builtResume?.title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {app.testAttempt?.violationCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-25">
                      <FaExclamationTriangle /> {app.testAttempt.violationCount}
                    </span>
                  )}
                  {app.testAttempt?.score !== null && app.testAttempt?.score !== undefined && (
                    <span className="text-sm font-display text-yellow-50">{app.testAttempt.score} marks</span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[app.status]}`}>
                    {statusLabel[app.status] || app.status}
                  </span>
                  {app.status === 'applied' && (
                    <span title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
                      <IconBtn
                        text="Invite to test"
                        onclick={() => handleInvite(app._id)}
                        customClasses="text-xs px-3 py-2"
                        disabled={isLocked}
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
                  {app.status === 'completed_test' && (
                    <span className="flex items-center gap-2" title={isLocked ? 'Locked until an admin approves your recruiter account' : undefined}>
                      <button
                        onClick={() => handleOutcome(app._id, 'hired')}
                        disabled={isLocked}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-caribgreen-700 text-caribgreen-100 text-xs font-semibold hover:bg-caribgreen-700/20 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaCheck className="text-[10px]" /> Hire
                      </button>
                      <button
                        onClick={() => handleOutcome(app._id, 'rejected')}
                        disabled={isLocked}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-pink-700 text-pink-100 text-xs font-semibold hover:bg-pink-700/20 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaTimes className="text-[10px]" /> Reject
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RecruiterLayout>
  )
}

export default JobApplicantsList
