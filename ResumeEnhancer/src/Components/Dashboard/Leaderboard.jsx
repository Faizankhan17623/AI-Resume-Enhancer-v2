import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaTrophy, FaMedal } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import { GetLeaderboard, GetStreak } from '../../Services/operations/Review'

const rankColor = (rank) =>
  rank === 1 ? 'text-yellow-50' : rank === 2 ? 'text-richblack-100' : rank === 3 ? 'text-pink-200' : 'text-richblack-300'

const rankIcon = (rank) => {
  if (rank > 3) return null
  return <FaMedal className={rankColor(rank)} />
}

const scoreColor = (score) =>
  score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'

const Leaderboard = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { leaderboard, loading } = useSelector((state) => state.review)

  useEffect(() => {
    dispatch(GetLeaderboard(token))
    dispatch(GetStreak(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DashboardLayout title="Leaderboard">
      <Helmet>
        <title>Leaderboard | ResumeEnhancer</title>
      </Helmet>

      <div className="h-full overflow-y-auto max-w-3xl mx-auto px-4 lg:px-6 py-8 animate-fadeIn">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-richblack-5 tracking-tight flex items-center justify-center gap-3">
            <FaTrophy className="text-yellow-50" /> Leaderboard
          </h1>
          <p className="mt-2 text-richblack-300 text-sm">
            Top ATS scores across everyone using ResumeEnhancer — fully anonymous, no resume content is ever shown.
          </p>
        </div>

        {loading ? (
          <Loading text="Loading the leaderboard..." />
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-10 text-center">
            <p className="text-richblack-300 text-sm">No scores yet — be the first to show up here.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 overflow-hidden">
            <div className="divide-y divide-richblack-700">
              {leaderboard.map((row) => (
                <div
                  key={row.rank}
                  className={`flex items-center justify-between px-6 py-4 transition-colors duration-200 ${
                    row.isYou ? 'bg-yellow-900/10 border-l-4 border-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 text-lg font-extrabold font-mono flex items-center gap-1.5 ${rankColor(row.rank)}`}>
                      {rankIcon(row.rank)} {row.rank}
                    </span>
                    <span className={`text-sm font-medium ${row.isYou ? 'text-yellow-50' : 'text-richblack-100'}`}>
                      {row.isYou ? `${row.label} (You)` : row.label}
                    </span>
                  </div>
                  <span className={`text-xl font-extrabold font-mono ${scoreColor(row.bestScore)}`}>
                    {row.bestScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Leaderboard
