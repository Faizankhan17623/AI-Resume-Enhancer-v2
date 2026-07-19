import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { motion } from 'motion/react'
import { FaUsers, FaRupeeSign, FaFileAlt, FaPercent, FaRobot, FaHeartbeat, FaGlobe, FaSignInAlt, FaNetworkWired } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetDashboardStats, GetAiStats, GetHealth, GetTraffic } from '../../Services/operations/Admin'
import { setTrafficRange } from '../../Slices/adminSlice'

const tooltipStyle = { backgroundColor: '#FFFFFF', border: '1px solid #E6DDD0', borderRadius: '10px', color: '#1F2937' }

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

// x-axis tick sir — hourly buckets show just the hour, daily buckets show month/day
const formatBucket = (bucket, range) => {
  if (!bucket) return ''
  if (range === 'day') return bucket.slice(11) // "2026-07-19 14:00" -> "14:00"
  return bucket.slice(5) // "2026-07-19" -> "07-19"
}

const RANGE_OPTIONS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

const Overview = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { stats, charts, aiStats, health, traffic, trafficRange, loading } = useSelector((state) => state.admin)

  useEffect(() => {
    dispatch(GetDashboardStats(token))
    dispatch(GetAiStats(token))
    dispatch(GetHealth(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    dispatch(GetTraffic(token, trafficRange))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trafficRange])

  if (loading || !stats) {
    return (
      <div className="min-h-screen w-full bg-richblack-900">
        <Navbar />
        <AdminNav />
        <Loading text="Loading the dashboard..." />
      </div>
    )
  }

  // merge the two series on bucket sir so one chart can show both lines side by side
  const trafficChartData = (() => {
    if (!traffic) return []
    const byBucket = {}
    for (const v of traffic.series.visitors) byBucket[v.bucket] = { bucket: v.bucket, visitors: v.count, logins: 0 }
    for (const l of traffic.series.logins) {
      if (!byBucket[l.bucket]) byBucket[l.bucket] = { bucket: l.bucket, visitors: 0, logins: 0 }
      byBucket[l.bucket].logins = l.count
    }
    return Object.values(byBucket).sort((a, b) => a.bucket.localeCompare(b.bucket))
  })()

  const statCards = [
    { icon: <FaUsers className="text-blue-100" />, label: 'Total Users', value: stats.users.total, sub: `${stats.users.verified} verified` },
    { icon: <FaRupeeSign className="text-caribgreen-100" />, label: 'Revenue', value: `₹${stats.revenue.totalRupees}`, sub: `${stats.revenue.paidOrders} paid orders` },
    { icon: <FaFileAlt className="text-yellow-50" />, label: 'Reviews', value: stats.usage.totalReviews, sub: `avg score ${stats.usage.avgAtsScore}` },
    { icon: <FaPercent className="text-pink-100" />, label: 'Paid Conversion', value: `${stats.users.paidConversion}%`, sub: `Pro ${stats.users.plans.Pro} · Max ${stats.users.plans.ProMax}` },
  ]

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stat cards sir */}
        <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <motion.div key={index} variants={fadeUp} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-900/15 flex items-center justify-center">{card.icon}</div>
                <span className="text-xs font-medium text-richblack-300">{card.label}</span>
              </div>
              <p className="font-display text-2xl text-richblack-5">{card.value}</p>
              <p className="text-xs text-richblack-400 mt-1">{card.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Traffic sir — unique visitors (cookie+IP) and logins, filterable by day/week/month */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2"><FaGlobe className="text-caribgreen-100" /> Traffic</h2>
            <div className="flex items-center gap-1 bg-richblack-900 rounded-lg p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => dispatch(setTrafficRange(opt.key))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    trafficRange === opt.key
                      ? 'bg-yellow-50 text-richblack-900'
                      : 'text-richblack-300 hover:text-richblack-5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {traffic ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-caribgreen-100/15 flex items-center justify-center"><FaUsers className="text-caribgreen-100" /></div>
                  <div>
                    <p className="font-display text-xl text-richblack-5">{traffic.summary.uniqueVisitors}</p>
                    <p className="text-xs text-richblack-400">unique visitors</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100/15 flex items-center justify-center"><FaSignInAlt className="text-blue-100" /></div>
                  <div>
                    <p className="font-display text-xl text-richblack-5">{traffic.summary.logins}</p>
                    <p className="text-xs text-richblack-400">logins</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-pink-100/15 flex items-center justify-center"><FaNetworkWired className="text-pink-100" /></div>
                  <div>
                    <p className="font-display text-xl text-richblack-5">{traffic.summary.uniqueLoginIps}</p>
                    <p className="text-xs text-richblack-400">unique login IPs</p>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trafficChartData}>
                  <defs>
                    <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6F5E" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2F6F5E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="loginsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#118AB2" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#118AB2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6DDD0" />
                  <XAxis dataKey="bucket" stroke="#8B93A0" fontSize={10} tickFormatter={(b) => formatBucket(b, trafficRange)} />
                  <YAxis stroke="#8B93A0" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(b) => formatBucket(b, trafficRange)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="visitors" name="Unique visitors" stroke="#2F6F5E" fill="url(#visitorsFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="logins" name="Logins" stroke="#118AB2" fill="url(#loginsFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-sm text-richblack-400">Loading traffic...</p>
          )}
        </div>

        {/* Health + AI row sir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <h2 className="font-display text-lg text-richblack-5 mb-4 flex items-center gap-2"><FaHeartbeat className="text-pink-100" /> System Health</h2>
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

          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <h2 className="font-display text-lg text-richblack-5 mb-4 flex items-center gap-2"><FaRobot className="text-blue-100" /> AI — last 24 hours</h2>
            {aiStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-display text-2xl text-richblack-5">{aiStats.today.calls}</p>
                  <p className="text-xs text-richblack-400">LLM calls</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-richblack-5">{aiStats.today.tokens.toLocaleString()}</p>
                  <p className="text-xs text-richblack-400">tokens burned</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-richblack-5">{aiStats.today.avgLatencyMs}ms</p>
                  <p className="text-xs text-richblack-400">avg latency</p>
                </div>
                <div>
                  <p className={`font-display text-2xl ${aiStats.today.errorRate > 5 ? 'text-pink-200' : 'text-caribgreen-100'}`}>{aiStats.today.errorRate}%</p>
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
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">Signups — 30 days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={charts?.signupsPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DDD0" />
                <XAxis dataKey="_id" stroke="#8B93A0" fontSize={10} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke="#8B93A0" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#118AB2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">Reviews — 30 days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={charts?.reviewsPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DDD0" />
                <XAxis dataKey="_id" stroke="#8B93A0" fontSize={10} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke="#8B93A0" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#2F6F5E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">Revenue (paise) — 30 days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={charts?.revenuePerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DDD0" />
                <XAxis dataKey="_id" stroke="#8B93A0" fontSize={10} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke="#8B93A0" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="amount" fill="#2F6F5E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </PageTransition>
    </div>
  )
}

export default Overview
