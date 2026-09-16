import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaMapMarkerAlt, FaBriefcase, FaCheckCircle, FaEnvelopeOpenText, FaRupeeSign, FaClock } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Footer from '../Home/Footer'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import ApplyModal from './ApplyModal'
import { GetJobInviteByToken } from '../../Services/operations/Job'

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
        <FaClock /> Unpaid{job.unpaidDurationMonths ? ` • ${job.unpaidDurationMonths} month${job.unpaidDurationMonths === 1 ? '' : 's'}` : ''}
        {job.certificateProvided ? ' • Certificate on completion' : ''}
      </span>
    )
  }
  return null
}

// candidate landing page for a direct job invite sir — see controllers/JobInvite.js's
// getJobInviteByToken. Deliberately no jobBoard/currentPublicJob slice reuse: this is a one-off
// token-gated view with its own loading/error shape (pending/applied/expired/not-found), not a
// normal public job fetch.
const JobInviteLanding = () => {
  const { token: inviteToken } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn } = useSelector((state) => state.auth)
  const [state, setState] = useState({ loading: true, data: null })
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await GetJobInviteByToken(inviteToken)()
      if (!cancelled) setState({ loading: false, data: result })
    })()
    return () => { cancelled = true }
  }, [inviteToken])

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      navigate('/Login', { state: { from: `/Jobs/invite/${inviteToken}` } })
      return
    }
    setApplyOpen(true)
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-richblack-900 flex flex-col">
        <Navbar />
        <Loading text="Loading your invite..." />
      </div>
    )
  }

  const { data } = state
  const job = data?.job

  if (!data?.success || !job) {
    return (
      <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto px-6 py-24 w-full text-center">
          <FaEnvelopeOpenText className="mx-auto text-3xl text-richblack-400 mb-4" />
          <h1 className="font-display text-xl text-richblack-5 mb-2">This invite couldn't be loaded</h1>
          <p className="text-sm text-richblack-300">{data?.message || "This invite link is invalid or has expired."}</p>
          <Link to="/Jobs" className="inline-block mt-6 text-sm text-yellow-50 hover:underline">Browse public jobs instead</Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex flex-col">
      <Helmet>
        <title>{job.title} at {job.companyName} | Resumify</title>
      </Helmet>
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold rounded-full bg-yellow-50/10 text-yellow-25 border border-yellow-50/30 mb-6">
          <FaEnvelopeOpenText /> You've been personally invited to this role
        </span>

        <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-8">
          <h1 className="font-display text-2xl text-richblack-5">{job.title}</h1>
          <p className="text-warm-200 mt-1">{job.companyName}</p>

          <div className="flex items-center gap-4 mt-4 text-sm text-richblack-300 flex-wrap">
            {job.location && <span className="flex items-center gap-1.5"><FaMapMarkerAlt /> {job.location}</span>}
            {job.employmentType && <span className="flex items-center gap-1.5"><FaBriefcase /> {job.employmentType}</span>}
            <CompensationLine job={job} />
          </div>

          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {job.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 text-[11px] rounded-full bg-richblack-700 text-richblack-200 border border-richblack-600">
                  {skill}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-richblack-200 whitespace-pre-wrap mt-6 leading-relaxed">{job.description}</p>

          <div className="mt-8">
            {data.status === 'applied' ? (
              <>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full bg-caribgreen-700/30 text-caribgreen-100 border border-caribgreen-700">
                  <FaCheckCircle /> Applied
                </span>
                <p className="text-xs text-richblack-400 mt-3">
                  You've already applied to this invite. Check{' '}
                  <Link to="/Dashboard/My-Applications" className="text-yellow-50 hover:underline">My Applications</Link>{' '}
                  for its status.
                </p>
              </>
            ) : (
              <>
                <IconBtn text="Apply" onclick={handleApplyClick} customClasses="w-full justify-center sm:w-auto" />
                <p className="text-xs text-richblack-400 mt-3">
                  This is a private listing — you're seeing it because {job.companyName} invited
                  you directly. Applying takes a couple of minutes.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {applyOpen && (
        <ApplyModal
          jobId={job._id}
          onClose={() => setApplyOpen(false)}
          onSuccess={() => {
            setApplyOpen(false)
            navigate('/Dashboard/My-Applications')
          }}
        />
      )}
    </div>
  )
}

export default JobInviteLanding
