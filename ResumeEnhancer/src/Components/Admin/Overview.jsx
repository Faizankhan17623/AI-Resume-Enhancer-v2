import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { motion } from 'motion/react'
import { FaUsers, FaRupeeSign, FaFileAlt, FaPercent, FaRobot, FaHeartbeat, FaGlobe, FaSignInAlt, FaNetworkWired, FaUserClock, FaExclamationTriangle } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetDashboardStats, GetAiStats, GetHealth, GetDeletions, GetTraffic } from '../../Services/operations/Admin'
import { setTrafficRange } from '../../Slices/adminSlice'

// validated categorical slots (dataviz skill, run against this app's own light/dark surfaces:
// #FFFFFF / #1F1C16 — both clear the lightness/chroma/CVD/normal-vision gates, see chat history)
// sir — these are chart-identity colors only, kept separate from the app's teal/coral UI accents
const CHART_COLORS = {
  light: { blue: '#2a78d6', aqua: '#1baf7a' },
  dark: { blue: '#3987e5', aqua: '#199e70' },
}

// theme-aware chart chrome sir — reads the "dark" class the same way the rest of the app does,
// so gridlines/tooltip/axis actually flip instead of staying hardcoded light-mode hex.
// Watches the class with a MutationObserver so charts re-render live if the user flips
// the theme toggle (useTheme.js) while this page is open, not just on next page load.
const useChartTheme = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const mode = isDark ? 'dark' : 'light'
  return {
    mode,
    seriesBlue: CHART_COLORS[mode].blue,
    seriesAqua: CHART_COLORS[mode].aqua,
    surface: isDark ? '#1F1C16' : '#FFFFFF',
    grid: isDark ? '#3A3428' : '#E6DDD0',
    axis: isDark ? '#706A5C' : '#8B93A0',
    tooltipStyle: {
      backgroundColor: isDark ? '#26221A' : '#FFFFFF',
      border: `1px solid ${isDark ? '#3A3428' : '#E6DDD0'}`,
      borderRadius: '10px',
      color: isDark ? '#F3EFE6' : '#1F1C16',
      fontSize: 12,
    },
  }
}

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

// one legend key per series sir — Recharts default legend already renders swatch + name,
// this just keys the wrapper font/size to the chart chrome instead of Recharts' own defaults
const legendStyle = { fontSize: 12 }

const Overview = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { stats, charts, aiStats, health, deletions, traffic, trafficRange, loading } = useSelector((state) => state.admin)
  const { seriesBlue, seriesAqua, grid, axis, tooltipStyle } = useChartTheme()

  useEffect(() => {
    dispatch(GetDashboardStats(token))
    dispatch(GetAiStats(token))
    dispatch(GetHealth(token))
    dispatch(GetDeletions(token))
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

  // surfaces the most recent AI_COST_ALERT audit entry (see AiCostAlert.js) as an in-app
  // banner sir — that cron previously only emailed ADMIN_ALERT_EMAIL, invisible in-app
  const latestCostAlert = deletions?.recentCostAlert

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

        {/* AI cost-alert banner sir — the cron that checks this only ever emailed
            ADMIN_ALERT_EMAIL before, so it fired silently as far as this dashboard knew */}
        {latestCostAlert && (
          <div className="rounded-xl bg-pink-700/15 border border-pink-700/40 px-5 py-3.5 flex items-center gap-3">
            <FaExclamationTriangle className="text-pink-100 shrink-0" />
            <p className="text-sm text-richblack-100">
              <span className="text-pink-100 font-medium">AI usage threshold breached</span>
              {' — '}{latestCostAlert.details?.tokens?.toLocaleString()} tokens, {latestCostAlert.details?.errorRate}% error rate in the last 24h
              <span className="text-richblack-400 ml-2 text-xs">{new Date(latestCostAlert.createdAt).toLocaleString()}</span>
            </p>
          </div>
        )}

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

              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trafficChartData}>
                  <defs>
                    <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={seriesBlue} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={seriesBlue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="loginsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={seriesAqua} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={seriesAqua} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" stroke={grid} vertical={false} />
                  <XAxis dataKey="bucket" stroke={axis} fontSize={11} tickLine={false} axisLine={{ stroke: grid }} tickFormatter={(b) => formatBucket(b, trafficRange)} />
                  <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(b) => formatBucket(b, trafficRange)} />
                  <Legend wrapperStyle={legendStyle} />
                  <Area type="monotone" dataKey="visitors" name="Unique visitors" stroke={seriesBlue} fill="url(#visitorsFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="logins" name="Logins" stroke={seriesAqua} fill="url(#loginsFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-sm text-richblack-400">Loading traffic...</p>
          )}
        </div>

        {/* Health + AI + Deletions row sir */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {/* Account deletions sir — visibility into the silent 2-day purge cron
              (AccountPurgeCron.js) that previously only logged to console */}
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
            <h2 className="font-display text-lg text-richblack-5 mb-4 flex items-center gap-2"><FaUserClock className="text-yellow-50" /> Account Deletions</h2>
            {deletions ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-display text-2xl text-richblack-5">{deletions.pendingCount}</p>
                    <p className="text-xs text-richblack-400">pending (2-day window)</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl text-richblack-5">{deletions.purgedLast30Days}</p>
                    <p className="text-xs text-richblack-400">purged — 30 days</p>
                  </div>
                </div>
                {deletions.recentPurges?.length > 0 && (
                  <div>
                    <p className="text-xs text-richblack-400 mb-2">Recently purged</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {deletions.recentPurges.slice(0, 5).map((log) => (
                        <div key={log._id} className="flex items-center justify-between text-xs">
                          <span className="text-richblack-100 truncate">{log.targetEmail}</span>
                          <span className="text-richblack-400 shrink-0 ml-2">{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-richblack-400">Loading...</p>
            )}
          </div>
        </div>

        {/* 30-day charts sir — one categorical slot (validated blue) per single-series chart,
            so every chart in this row reads as the same "kind of thing" rather than four
            unrelated ad-hoc colors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">Signups — 30 days</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={charts?.signupsPerDay || []}>
                <CartesianGrid strokeDasharray="none" stroke={grid} vertical={false} />
                <XAxis dataKey="_id" stroke={axis} fontSize={10} tickLine={false} axisLine={{ stroke: grid }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke={axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: grid, opacity: 0.3 }} />
                <Bar dataKey="count" name="Signups" fill={seriesBlue} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">Reviews — 30 days</h3>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={charts?.reviewsPerDay || []}>
                <CartesianGrid strokeDasharray="none" stroke={grid} vertical={false} />
                <XAxis dataKey="_id" stroke={axis} fontSize={10} tickLine={false} axisLine={{ stroke: grid }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke={axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: grid }} />
                <Line type="monotone" dataKey="count" name="Reviews" stroke={seriesBlue} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">Revenue (paise) — 30 days</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={charts?.revenuePerDay || []}>
                <CartesianGrid strokeDasharray="none" stroke={grid} vertical={false} />
                <XAxis dataKey="_id" stroke={axis} fontSize={10} tickLine={false} axisLine={{ stroke: grid }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke={axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: grid, opacity: 0.3 }} />
                <Bar dataKey="amount" name="Revenue" fill={seriesBlue} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
            <h3 className="font-display text-base text-richblack-5 mb-4">AI tokens — 30 days</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={aiStats?.last30Days?.perDay || []}>
                <CartesianGrid strokeDasharray="none" stroke={grid} vertical={false} />
                <XAxis dataKey="_id" stroke={axis} fontSize={10} tickLine={false} axisLine={{ stroke: grid }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis stroke={axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: grid, opacity: 0.3 }} />
                <Bar dataKey="tokens" name="Tokens" fill={seriesBlue} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* recent AI errors sir — surfaces AiLog failures the admin would otherwise only see via getAiStats' recentErrors, previously fetched but never rendered */}
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6">
          <h2 className="font-display text-lg text-richblack-5 mb-4 flex items-center gap-2"><FaRobot className="text-pink-100" /> Recent AI errors</h2>
          {aiStats?.recentErrors?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-richblack-400 border-b border-richblack-700">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Error</th>
                    <th className="pb-2 pr-4">Latency</th>
                    <th className="pb-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {aiStats.recentErrors.map((err, i) => (
                    <tr key={i} className="border-b border-richblack-700/50 last:border-0">
                      <td className="py-2 pr-4 text-richblack-100">{err.type}</td>
                      <td className="py-2 pr-4 text-richblack-300">{err.plan}</td>
                      <td className="py-2 pr-4 text-pink-200 max-w-xs truncate" title={err.error}>{err.error}</td>
                      <td className="py-2 pr-4 text-richblack-400 font-mono text-xs">{err.latencyMs}ms</td>
                      <td className="py-2 text-richblack-400 text-xs">{new Date(err.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-richblack-400">No AI errors in the last 30 days.</p>
          )}
        </div>
      </PageTransition>
    </div>
  )
}

export default Overview
