import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FaFileAlt, FaTrophy, FaBolt, FaArrowUp, FaArrowDown, FaPlus, FaHistory, FaFire, FaMedal } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import { GetProgress, GetAllReviews, GetStreak } from '../../Services/operations/Review'

const DashboardHome = () => {
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { progress, allReviews, streak } = useSelector((state) => state.review)

  useEffect(() => {
    dispatch(GetProgress(token))
    dispatch(GetAllReviews(token))
    dispatch(GetStreak(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = progress?.stats
  // the graph wants friendly labels sir
  const chartData = (progress?.points || []).map((p, index) => ({
    name: `#${index + 1}`,
    score: p.atsScore,
    title: p.jdTitle
  }))

  const statCards = [
    { icon: <FaFileAlt className="text-blue-100" />, label: 'Total Reviews', value: stats?.totalReviews ?? 0 },
    { icon: <FaTrophy className="text-yellow-50" />, label: 'Best Score', value: stats?.bestScore ?? 0 },
    { icon: <FaBolt className="text-caribgreen-100" />, label: 'Latest Score', value: stats?.latestScore ?? 0 },
    {
      icon: (stats?.improvement ?? 0) >= 0 ? <FaArrowUp className="text-caribgreen-100" /> : <FaArrowDown className="text-pink-200" />,
      label: 'Improvement',
      value: `${(stats?.improvement ?? 0) >= 0 ? '+' : ''}${stats?.improvement ?? 0}`
    },
  ]

  const scoreColor = (score) =>
    score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Dashboard | ResumeEnhancer</title>
      </Helmet>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10 animate-fadeIn">

        {/* Greeting + quick actions sir */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-richblack-5 tracking-tight">
                Hey, <span className="bg-gradient-to-r from-yellow-200 to-yellow-50 bg-clip-text text-transparent">{user?.firstName}</span>
              </h1>
              {streak?.currentStreak > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-richblack-800 border border-yellow-800/40 text-sm font-bold text-yellow-50">
                  <FaFire className="text-pink-200" /> {streak.currentStreak}-day streak
                </span>
              )}
            </div>
            <p className="mt-1 text-richblack-300 text-sm">Here is how your resume is doing.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/Dashboard/New-Review">
              <IconBtn text="New ATS Review" customClasses="text-sm">
                <FaPlus />
              </IconBtn>
            </Link>
            <Link to="/Dashboard/History">
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                <FaHistory /> History
              </button>
            </Link>
            <Link to="/Dashboard/Leaderboard">
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 hover:text-richblack-5 transition-all duration-200 cursor-pointer">
                <FaMedal /> Leaderboard
              </button>
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((card, index) => (
            <div key={index} className="rounded-xl bg-richblack-800 border border-richblack-700 p-5 hover:border-richblack-500 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-richblack-700 flex items-center justify-center text-lg">
                  {card.icon}
                </div>
                <span className="text-xs font-medium text-richblack-300">{card.label}</span>
              </div>
              <p className="text-3xl font-extrabold text-richblack-5 font-mono">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Score Progress Graph sir — the money screen */}
        <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-6 mb-10">
          <h2 className="text-richblack-5 font-bold text-lg mb-6">Score Progress</h2>
          {chartData.length < 2 ? (
            <p className="text-richblack-300 text-sm py-10 text-center">
              Run at least two reviews and your progress line shows up here sir — <Link to="/Dashboard/New-Review" className="text-yellow-50 hover:underline">start one now</Link>
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C333F" />
                <XAxis dataKey="name" stroke="#838894" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#838894" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161D29', border: '1px solid #2C333F', borderRadius: '8px', color: '#F1F2FF' }}
                  labelStyle={{ color: '#999DAA' }}
                />
                <Line type="monotone" dataKey="score" stroke="#FFD60A" strokeWidth={2.5} dot={{ fill: '#FFD60A', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-6">
          <h2 className="text-richblack-5 font-bold text-lg mb-4">Recent Reviews</h2>
          {allReviews.length === 0 ? (
            <p className="text-richblack-300 text-sm py-6 text-center">No reviews yet — your first one is a click away.</p>
          ) : (
            <div className="divide-y divide-richblack-700">
              {allReviews.slice(0, 5).map((review) => (
                <Link
                  key={review._id}
                  to={`/Dashboard/Review/${review._id}`}
                  className="flex items-center justify-between py-4 px-2 hover:bg-richblack-700/40 rounded-lg transition-colors duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-richblack-5 truncate">{review.jdTitle || 'Job Description'}</p>
                    <p className="text-xs text-richblack-400 mt-0.5">
                      {new Date(review.createdAt).toDateString()} · {review.plan} plan
                    </p>
                  </div>
                  <span className={`text-xl font-extrabold font-mono ${scoreColor(review.atsScore)}`}>
                    {review.atsScore}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
