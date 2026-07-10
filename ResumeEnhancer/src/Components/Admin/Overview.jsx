import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FaUsers, FaRupeeSign, FaFileAlt, FaPercent, FaRobot, FaHeartbeat } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import { GetDashboardStats, GetAiStats, GetHealth } from '../../Services/operations/Admin'

const tooltipStyle = { backgroundColor: '#161D29', border: '1px solid #2C333F', borderRadius: '8px', color: '#F1F2FF' }

// green/red status dot sir
const HealthDot = ({ ok, label, latency }) => (
  <div className="flex items-center gap-2">
    <span className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-caribgreen-100' : 'bg-pink-200'} ${ok ? '' : 'animate-pulse'}`} />
    <span className="text-sm text-richblack-100">{label}</span>
    {latency !== null && latency !== undefined && (
      <span className="text-xs text-richblack-400 font-mono">{latency}ms</span>
    )}
  </div>
)

const Overview = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { stats, charts, aiStats, health, loading } = useSelector((state) => state.admin)

  useEffect(() => {
    dispatch(GetDashboardStats(token))
    dispatch(GetAiStats(token))
    dispatch(GetHealth(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !stats) {
    return (
      <div className="min-h-screen w-full bg-richblack-900">
        <Navbar />
        <AdminNav />
        <Loading text="Loading the dashboard..." />
      </div>
    )
  }

  const statCards = [
    { icon: <FaUsers className="text-blue-100" />, label: 'Total Users', value: stats.users.total, sub: `${stats.users.verified} verified` },
    { icon: <FaRupeeSign className="text-caribgreen-100" />, label: 'Revenue', value: `₹${stats.revenue.totalRupees}`, sub: `${stats.revenue.paidOrders} paid orders` },
    { icon: <FaFileAlt className="text-yellow-50" />, label: 'Reviews', value: stats.usage.totalReviews, sub: `avg score ${stats.usage.avgAtsScore}` },
    { icon: <FaPercent className="text-pink-100" />, label: 'Paid Conversion', value: `${stats.users.paidConversion}%`, sub: `Pro ${stats.users.plans.Pro} · Max ${stats.users.plans.ProMax}` },
  ]

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin | ResumeEnhancer</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fadeIn">

        {/* Stat cards sir */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <div key={index} className="rounded-xl bg-richblack-800 border border-richblack-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-richblack-700 flex items-center justify-center">{card.icon}</div>
                <span className="text-xs font-medium text-richblack-300">{card.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-richblack-5 font-mono">{card.value}</p>
              <p className="text-xs text-richblack-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Health + AI row sir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-6">
            <h2 className="text-richblack-5 font-bold mb-4 flex items-center gap-2"><FaHeartbeat className="text-pink-100" /> System Health</h2>
            {health ? (
              <div className="space-y-3">
                <HealthDot ok={health.db?.ok} label="MongoDB" latency={health.db?.latencyMs} />
                <HealthDot ok={health.ai?.ok} label="Groq AI" latency={health.ai?.latencyMs} />
                <p className="text-xs text-richblack-400 pt-2">
                  Uptime {Math.floor((health.server?.uptimeSeconds || 0) / 3600)}h {Math.floor(((health.server?.uptimeSeconds || 0) % 3600) / 60)}m
                  · Heap {health.server?.memoryMB?.heapUsed}MB · Node {health.server?.node}
                </p>
              </div>
            ) : (
              <p className="text-sm text-richblack-400">Checking...</p>
            )}
          </div>

          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-6">
            <h2 className="text-richblack-5 font-bold mb-4 flex items-center gap-2"><FaRobot className="text-blue-100" /> AI — last 24 hours</h2>
            {aiStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-extrabold text-richblack-5 font-mono">{aiStats.today.calls}</p>
                  <p className="text-xs text-richblack-400">LLM calls</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-richblack-5 font-mono">{aiStats.today.tokens.toLocaleString()}</p>
                  <p className="text-xs text-richblack-400">tokens burned</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-richblack-5 font-mono">{aiStats.today.avgLatencyMs}ms</p>
                  <p className="text-xs text-richblack-400">avg latency</p>
                </div>
                <div>
                  <p className={`text-2xl font-extrabold font-mono ${aiStats.today.errorRate > 5 ? 'text-pink-200' : 'text-caribgreen-100'}`}>{aiStats.today.errorRate}%</p>
                  <p className="text-xs text-richblack-400">error rate</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-richblack-400">Loading...</p>
            )}
          </div>
        </div>

        {/* 30-day charts sir */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-5">
            <h3 className="text-richblack-5 font-bold text-sm mb-4">Signups — 30 days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={charts?.signupsPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C333F" />
                <XAxis dataKey="_id" stroke="#838894" fontSize={10} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke="#838894" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#47A5C5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-5">
            <h3 className="text-richblack-5 font-bold text-sm mb-4">Reviews — 30 days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={charts?.reviewsPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C333F" />
                <XAxis dataKey="_id" stroke="#838894" fontSize={10} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke="#838894" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#FFD60A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 border border-richblack-700 p-5">
            <h3 className="text-richblack-5 font-bold text-sm mb-4">Revenue (paise) — 30 days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={charts?.revenuePerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C333F" />
                <XAxis dataKey="_id" stroke="#838894" fontSize={10} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke="#838894" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="amount" fill="#06D6A0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
