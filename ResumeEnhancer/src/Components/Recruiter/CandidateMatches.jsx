import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import RecruiterLayout from './RecruiterLayout'
import Loading from '../extra/Loading'
import { apiConnector } from '../../Services/apiConnector'
import BASE_URL from '../../utils/backendUrl'

export default function CandidateMatches() {
  const { jobId } = useParams(); const { token } = useSelector(s => s.auth); const [data, setData] = useState(null)
  useEffect(() => { apiConnector('GET', `${BASE_URL}/jobs/${jobId}/candidate-matches`, null, { Authorization: `Bearer ${token}` }).then(r => setData(r.data)).catch(() => setData({ candidates: [] })) }, [jobId, token])
  if (!data) return <RecruiterLayout><Loading text="Ranking candidates..." /></RecruiterLayout>
  return <RecruiterLayout><Helmet><title>Candidate Matches | Resumify</title></Helmet><div className="max-w-4xl space-y-5"><div><h1 className="font-display text-2xl text-richblack-5">Candidate matches</h1><p className="text-sm text-richblack-400">{data.job?.title} · ranked by resume-to-role fit</p></div><div className="space-y-3">{data.candidates.map(item => <div key={item.application._id} className="rounded-xl bg-richblack-800 p-4 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-richblack-5">{item.application.candidate?.firstName} {item.application.candidate?.lastName}</p><p className="text-xs text-richblack-400">{item.application.candidate?.email} · {item.match.tier}</p>{item.match.reasoning && <p className="text-xs text-richblack-300 mt-2 max-w-xl">{item.match.reasoning}</p>}</div><span className="font-display text-2xl text-yellow-50">{item.match.score == null ? '—' : `${item.match.score}%`}</span></div>)}{!data.candidates.length && <p className="text-sm text-richblack-400">No applicants yet.</p>}</div></div></RecruiterLayout>
}
