import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaTrophy, FaMedal, FaFire, FaFileAlt } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import { GetLeaderboard, GetWeeklyReviewsLeaderboard, GetStreaksLeaderboard, GetStreak } from '../../Services/operations/Review'

const rankColor = (rank) =>
  rank === 1 ? 'text-yellow-50' : rank === 2 ? 'text-richblack-100' : rank === 3 ? 'text-pink-200' : 'text-richblack-300'

const rankIcon = (rank) => {
  if (rank > 3) return null
  return <FaMedal className={rankColor(rank)} />
}

const scoreColor = (score) =>
  score >= 70 ? 'text-caribgreen-100' : score >= 50 ? 'text-yellow-50' : 'text-pink-200'

// three boards sir — each has its own fetch thunk + state slice, but render the exact same row shape
const BOARDS = [
  {
    id: 'scores',
    label: 'Top ATS Scores',
    icon: FaTrophy,
    valueKey: 'bestScore',
    valueSuffix: '',
    valueColor: scoreColor,
    emptyText: 'No scores yet — be the first to show up here.',
    description: 'Top ATS scores across everyone using Resumify — fully anonymous, no resume content is ever shown.',
  },
  {
    id: 'weeklyReviews',
    label: 'Most Active This Week',
    icon: FaFileAlt,
    valueKey: 'value',
    valueSuffix: ' reviews',
    valueColor: () => 'text-blue-100',
    emptyText: 'No reviews run this week yet — run one to show up here.',
    description: 'Who ran the most ATS reviews in the last 7 days — rewards showing up, not just scoring high.',
  },
  {
    id: 'streaks',
    label: 'Longest Streaks',
    icon: FaFire,
    valueKey: 'value',
    valueSuffix: ' days',
    valueColor: () => 'text-warm-200',
    emptyText: 'No active streaks yet — use Resumify two days in a row to start one.',
    description: 'Longest consecutive-day activity streaks, live right now — fully anonymous.',
  },
]

const Leaderboard = () => {
  const [activeBoard, setActiveBoard] = useState('scores')
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { leaderboard, weeklyReviewsLeaderboard, streaksLeaderboard, loading } = useSelector((state) => state.review)

  useEffect(() => {
    dispatch(GetLeaderboard(token))
    dispatch(GetWeeklyReviewsLeaderboard(token))
    dispatch(GetStreaksLeaderboard(token))
    dispatch(GetStreak(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const boardData = {
    scores: leaderboard,
    weeklyReviews: weeklyReviewsLeaderboard,
    streaks: streaksLeaderboard,
  }

  const board = BOARDS.find((b) => b.id === activeBoard)
  const rows = boardData[activeBoard]

  return (
    <DashboardLayout title="Leaderboard">
      <Helmet>
        <title>Leaderboard | Resumify</title>
      </Helmet>

      <div className="h-full overflow-y-auto max-w-3xl mx-auto px-4 lg:px-6 py-8 animate-fadeIn">

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-richblack-5 tracking-tight flex items-center justify-center gap-3">
            <FaTrophy className="text-yellow-50" /> Leaderboard
          </h1>
          <p className="mt-2 text-richblack-300 text-sm max-w-lg mx-auto">{board.description}</p>
        </div>

        {/* board tabs sir */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-full bg-richblack-800 border border-richblack-600 p-1 gap-1">
            {BOARDS.map((b) => {
              const Icon = b.icon
              const active = activeBoard === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBoard(b.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    active ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-200 hover:text-richblack-5'
                  }`}
                >
                  <Icon className="text-[11px]" /> {b.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <Loading text="Loading the leaderboard..." />
        ) : rows.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-10 text-center">
            <p className="text-richblack-300 text-sm">{board.emptyText}</p>
          </div>
        ) : (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 overflow-hidden">
            <div className="divide-y divide-richblack-700">
              {rows.map((row) => (
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
                  <span className={`text-xl font-extrabold font-mono ${board.valueColor(row[board.valueKey])}`}>
                    {row[board.valueKey]}{board.valueSuffix}
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
