import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import RecruiterLayout from './RecruiterLayout'
import Loading from '../extra/Loading'
import { apiConnector } from '../../Services/apiConnector'
import BASE_URL from '../../utils/backendUrl'

// keyed remount sir, per 2026-11-14 audit — a different jobId is conceptually a different page,
// not an update to this one. Without the key, navigating from one job's matches to another
// before the first request resolves (back/forward, or any in-app link) could let the OLDER job's
// response land after jobId already changed, silently overwriting the new job's candidate list
// with the wrong job's data — and the stale candidate list stayed fully rendered the whole time
// since nothing ever reset `data` back to null. Keying by jobId makes React tear down and
// recreate this component's state from scratch on every job change, for free, instead of hand-
// rolling an alive-guard + manual state reset inside the effect (which also trips the
// react-hooks/set-state-in-effect lint rule for calling setState synchronously in an effect body).
export default function CandidateMatches() {
  const { jobId } = useParams()
  return <CandidateMatchesForJob key={jobId} jobId={jobId} />
}

function CandidateMatchesForJob({ jobId }) {
  const { token } = useSelector(s => s.auth); const [data, setData] = useState(null)
  // error sir, per 2026-11-08 audit — a failed fetch used to silently render as "No applicants
  // yet", indistinguishable from a job that genuinely has zero applicants. Now a transient fetch
  // failure shows its own message instead of a false "nobody applied".
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    apiConnector('GET', `${BASE_URL}/jobs/${jobId}/candidate-matches`, null, { Authorization: `Bearer ${token}` })
      .then(r => { if (alive) setData(r.data) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [jobId, token])
  if (error) return <RecruiterLayout><div className="max-w-4xl"><p className="text-sm text-richblack-400">Could not load candidate matches, please try again.</p></div></RecruiterLayout>
  if (!data) return <RecruiterLayout><Loading text="Ranking candidates..." /></RecruiterLayout>
  return <RecruiterLayout><Helmet><title>Candidate Matches | Resumify</title></Helmet><div className="max-w-4xl space-y-5"><div><h1 className="font-display text-2xl text-richblack-5">Candidate matches</h1><p className="text-sm text-richblack-400">{data.job?.title} · ranked by resume-to-role fit</p></div><div className="space-y-3">{data.candidates.map(item => <div key={item.application._id} className="rounded-xl bg-richblack-800 p-4 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-richblack-5">{item.application.candidate?.firstName} {item.application.candidate?.lastName}</p><p className="text-xs text-richblack-400">{item.application.candidate?.email} · {item.match.tier}</p>{item.match.reasoning && <p className="text-xs text-richblack-300 mt-2 max-w-xl">{item.match.reasoning}</p>}</div><span className="font-display text-2xl text-yellow-50">{item.match.score == null ? '—' : `${item.match.score}%`}</span></div>)}{!data.candidates.length && <p className="text-sm text-richblack-400">No applicants yet.</p>}</div></div></RecruiterLayout>
}
