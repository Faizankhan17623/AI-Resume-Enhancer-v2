import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaPlus } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { GetAllReviews } from '../../Services/operations/Review'

const scoreColor = (score) =>
  score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'

const History = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { allReviews, loading } = useSelector((state) => state.review)

  useEffect(() => {
    dispatch(GetAllReviews(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Review History | ResumeEnhancer</title>
      </Helmet>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10 animate-fadeIn">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-richblack-5 tracking-tight">
            Review <span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">History</span>
          </h1>
          <Link to="/Dashboard/New-Review">
            <IconBtn text="New Review" customClasses="text-sm">
              <FaPlus />
            </IconBtn>
          </Link>
        </div>

        {loading ? (
          <Loading text="Loading your history..." />
        ) : allReviews.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-16 text-center">
            <p className="text-richblack-200 mb-6">No reviews yet sir — your first honest ATS score is waiting.</p>
            <Link to="/Dashboard/New-Review" className="inline-block">
              <IconBtn text="Run my first review" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {allReviews.map((review) => (
              <Link
                key={review._id}
                to={`/Dashboard/Review/${review._id}`}
                className="flex items-center justify-between rounded-xl bg-richblack-800 border border-richblack-700 p-5 hover:border-richblack-500 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-richblack-5 truncate">{review.jdTitle || 'Job Description'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-richblack-400">{new Date(review.createdAt).toDateString()}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-richblack-700 text-yellow-50 border border-richblack-600">
                      {review.plan}
                    </span>
                    <span className="text-xs text-richblack-400">{review.verdict}</span>
                  </div>
                </div>
                <span className={`text-2xl font-extrabold font-mono shrink-0 ml-4 ${scoreColor(review.atsScore)}`}>
                  {review.atsScore}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default History
