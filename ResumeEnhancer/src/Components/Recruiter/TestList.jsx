import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaPlus, FaUsers, FaCopy, FaCheckCircle } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { GetMyTests, PublishTest } from '../../Services/operations/Test'

const statusBadge = {
  draft: 'bg-richblack-700 text-richblack-200 border-richblack-600',
  published: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700',
  closed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

const TestList = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { myTests, loading } = useSelector((state) => state.test)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    dispatch(GetMyTests(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePublish = async (testId) => {
    await dispatch(PublishTest(testId, token))
    dispatch(GetMyTests(token))
  }

  const handleCopyLink = (inviteCode, testId) => {
    const link = `${window.location.origin}/Test/${inviteCode}`
    navigator.clipboard.writeText(link)
    toast.success("Invite link copied")
    setCopiedId(testId)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>My Tests | Resumify Recruiter</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-richblack-5">My Tests</h1>
        <Link to="/Recruiter/New">
          <IconBtn text="New Test"><FaPlus /></IconBtn>
        </Link>
      </div>

      {loading ? (
        <Loading text="Loading your tests..." />
      ) : myTests.length === 0 ? (
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
          <p className="text-richblack-100 mb-2 font-semibold">No tests yet</p>
          <p className="text-richblack-300 text-sm mb-6">Create a proctored test to start screening candidates.</p>
          <Link to="/Recruiter/New" className="inline-block">
            <IconBtn text="Create your first test"><FaPlus /></IconBtn>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myTests.map((test) => (
            <div key={test._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-richblack-5 font-semibold truncate">{test.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusBadge[test.status]}`}>
                    {test.status}
                  </span>
                </div>
                <p className="text-xs text-richblack-400">
                  {test.timeLimitMinutes} min · {test.maxViolations} warnings before auto-exit
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {test.status === 'draft' && (
                  <IconBtn text="Publish" onclick={() => handlePublish(test._id)} customClasses="text-sm px-3 py-2" />
                )}
                {test.status === 'published' && test.inviteCode && (
                  <button
                    onClick={() => handleCopyLink(test.inviteCode, test._id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                  >
                    {copiedId === test._id ? <FaCheckCircle className="text-caribgreen-100" /> : <FaCopy />}
                    {copiedId === test._id ? 'Copied' : 'Copy invite link'}
                  </button>
                )}
                <Link
                  to={`/Recruiter/Tests/${test._id}/attempts`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-richblack-600 text-richblack-100 text-xs font-semibold hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                >
                  <FaUsers /> Attempts
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </RecruiterLayout>
  )
}

export default TestList
