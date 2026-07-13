import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FaFileAlt, FaTrophy, FaBolt, FaArrowUp, FaArrowDown, FaPlus, FaCheckCircle, FaRegCircle, FaTimes } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import { GetProgress, GetAllReviews, GetStreak } from '../../Services/operations/Review'
import { GetProfile, CompleteOnboarding } from '../../Services/operations/User'

const DashboardHome = () => {
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { progress, allReviews } = useSelector((state) => state.review)
  const { profile } = useSelector((state) => state.profile)

  useEffect(() => {
    dispatch(GetProgress(token))
    dispatch(GetAllReviews(token))
    dispatch(GetStreak(token))
    dispatch(GetProfile(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activity = profile?.activity
  const onboardingCompleted = profile?.user?.onboardingCompleted

  const onboardingSteps = [
    { label: 'Run your first AI resume review', done: (activity?.reviewCount ?? 0) > 0, to: '/Dashboard/New-Review' },
    { label: 'Save a resume to your library', done: (activity?.resumeCount ?? 0) > 0, to: '/Dashboard/Resumes' },
    { label: 'Start a chat with the AI coach', done: (activity?.chatCount ?? 0) > 0, to: '/Dashboard/Chats' },
    { label: 'Generate a tailored cover letter', done: (activity?.coverLetterCount ?? 0) > 0, to: '/Dashboard/Cover-Letter' },
  ]
  const completedSteps = onboardingSteps.filter((s) => s.done).length
  const showOnboarding = activity && onboardingCompleted === false && completedSteps < onboardingSteps.length

  const dismissOnboarding = () => dispatch(CompleteOnboarding(token))

  const stats = progress?.stats
  // the graph wants friendly labels sir
  const chartData = (progress?.points || []).map((p, index) => ({
    name: `#${index + 1}`,
    score: p.atsScore,
    title: p.jdTitle
  }))

  const statCards = [
    { icon: <FaFileAlt />, label: 'Total Reviews', value: stats?.totalReviews ?? 0 },
    { icon: <FaTrophy />, label: 'Best Score', value: stats?.bestScore ?? 0, valueClass: 'text-caribgreen-100' },
    { icon: <FaBolt />, label: 'Latest Score', value: stats?.latestScore ?? 0 },
    {
      icon: (stats?.improvement ?? 0) >= 0 ? <FaArrowUp /> : <FaArrowDown />,
      label: 'Improvement',
      value: `${(stats?.improvement ?? 0) >= 0 ? '+' : ''}${stats?.improvement ?? 0}`,
      valueClass: (stats?.improvement ?? 0) >= 0 ? 'text-caribgreen-100' : 'text-pink-200',
    },
  ]

  const scoreColor = (score) =>
    score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'

  return (
    <DashboardLayout title="Overview">
      <Helmet>
        <title>Dashboard | ResumeEnhancer</title>
      </Helmet>

      <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden px-4 lg:px-6 py-6 flex flex-col gap-6 animate-fadeIn">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-richblack-300">
            Hey <span className="text-richblack-5 font-semibold">{user?.firstName}</span> — here's how your resume is doing.
          </p>
          <Link to="/Dashboard/New-Review">
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:bg-yellow-25 transition-all duration-200 cursor-pointer">
              <FaPlus className="text-xs" /> New review
            </button>
          </Link>
        </div>

        {/* Onboarding checklist sir — shows until every step is done or the user dismisses it, never again after that */}
        {showOnboarding && (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg text-richblack-5">Get started</h2>
                <p className="text-xs text-richblack-400 mt-0.5">{completedSteps} of {onboardingSteps.length} done</p>
              </div>
              <button
                onClick={dismissOnboarding}
                className="text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer p-1"
                title="Dismiss"
              >
                <FaTimes />
              </button>
            </div>
            <div className="w-full h-1.5 rounded-full bg-richblack-700 overflow-hidden mb-5">
              <div
                className="h-full rounded-full bg-yellow-50 transition-all duration-700"
                style={{ width: `${(completedSteps / onboardingSteps.length) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {onboardingSteps.map((step) => (
                <Link
                  key={step.label}
                  to={step.to}
                  className={`flex items-center gap-2.5 text-sm rounded-lg px-3 py-2.5 transition-colors duration-200 ${
                    step.done ? 'text-richblack-400' : 'text-richblack-100 hover:bg-richblack-700/60'
                  }`}
                >
                  {step.done ? (
                    <FaCheckCircle className="text-caribgreen-100 shrink-0" />
                  ) : (
                    <FaRegCircle className="text-richblack-400 shrink-0" />
                  )}
                  <span className={step.done ? 'line-through' : ''}>{step.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stat cards sir — tighter icon-chip treatment from the mockup, soft shadow instead of a hard border */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <div key={index} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-900/15 flex items-center justify-center text-sm text-yellow-100">
                  {card.icon}
                </div>
                <span className="text-xs font-semibold text-richblack-400">{card.label}</span>
              </div>
              <p className={`font-display text-2xl ${card.valueClass || 'text-richblack-5'}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
          {/* Score Progress Graph sir — min-w-0 stops the ResponsiveContainer from overflowing its grid track and causing a page-wide x-axis scrollbar */}
          <div className="min-w-0 rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-richblack-5">Score progress</h2>
              <span className="text-xs text-richblack-400">Last {chartData.length} reviews</span>
            </div>
            {chartData.length < 2 ? (
              <p className="text-richblack-300 text-sm py-16 text-center">
                Run at least two reviews and your progress line shows up here — <Link to="/Dashboard/New-Review" className="text-yellow-50 hover:underline">start one now</Link>
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6DDD0" />
                  <XAxis dataKey="name" stroke="#8B93A0" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#8B93A0" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E6DDD0', borderRadius: '10px', color: '#1F2937' }}
                    labelStyle={{ color: '#5B6472' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#2F6F5E" strokeWidth={2.5} dot={{ fill: '#2F6F5E', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Reviews sir */}
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-richblack-5">Recent reviews</h2>
              <Link to="/Dashboard/History" className="text-xs font-semibold text-yellow-50 hover:underline">View all</Link>
            </div>
            {allReviews.length === 0 ? (
              <p className="text-richblack-300 text-sm py-10 text-center">No reviews yet — your first one is a click away.</p>
            ) : (
              <div className="divide-y divide-richblack-700">
                {allReviews.slice(0, 5).map((review) => (
                  <Link
                    key={review._id}
                    to={`/Dashboard/Review/${review._id}`}
                    className="flex items-center justify-between py-3 hover:opacity-80 transition-opacity duration-200"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-richblack-5 truncate">{review.jdTitle || 'Job Description'}</p>
                      <p className="text-xs text-richblack-400 mt-0.5">
                        {new Date(review.createdAt).toDateString()}
                      </p>
                    </div>
                    <span className={`text-lg font-extrabold font-mono shrink-0 ml-3 ${scoreColor(review.atsScore)}`}>
                      {review.atsScore}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardHome
