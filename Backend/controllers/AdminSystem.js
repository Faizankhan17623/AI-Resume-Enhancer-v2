const mongoose = require('mongoose')
const logger = require('../utils/logger')
const Grok = require('groq-sdk')
const { monitorEventLoopDelay } = require('node:perf_hooks')

const User = require('../Models/User')
const Payment = require('../Models/Payment')
const Review = require('../Models/Review')
const AiLog = require('../Models/AiLog')
const AuditLog = require('../Models/AuditLog')
const LoginLog = require('../Models/LoginLog')
const VisitorLog = require('../Models/VisitorLog')
const CreditSpend = require('../Models/CreditSpend')
const ReferralLog = require('../Models/ReferralLog')
const { REQUIRED_ENV_VARS } = require('../utils/checkRequiredEnv')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })

// event-loop lag sir — one histogram, kept running for the whole process lifetime, so
// getHealth just reads its current snapshot instead of sampling on the spot
const eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 })
eventLoopMonitor.enable()

// cache the health payload for a few seconds sir — the admin dashboard polls this, and
// every poll otherwise re-hits Groq/the mail relay for real, burning quota for nothing
let healthCache = { data: null, expiresAt: 0 }
const HEALTH_CACHE_MS = 30 * 1000

// the system-level admin endpoints live here sir — money, AI health, server health, insights, audit trail

// GET /admin/payments?status=paid&page=1&limit=20 — the money dashboard sir
exports.getPayments = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
        const status = req.query.status

        const filter = {}
        if (['created', 'paid', 'failed'].includes(status)) {
            filter.status = status
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const [payments, total, statusAgg, planAgg, mrrAgg] = await Promise.all([
            // never ship the Razorpay HMAC signature to the browser sir — same whitelist
            // pattern as the user-facing payment history query, the dashboard doesn't
            // display it and it's a payment-integrity secret, not UI data
            Payment.find(filter)
                .select('plan amount currency status orderId paymentId createdAt user')
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Payment.countDocuments(filter),
            // orders by status sir — the failure rate comes from this
            Payment.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
            ]),
            // paid revenue split by plan sir
            Payment.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: '$plan', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
            ]),
            // MRR sir — paid revenue of the last 30 days (subs are 30-day, so this IS the monthly recurring)
            Payment.aggregate([
                { $match: { status: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
        ])

        const byStatus = {}
        for (const s of statusAgg) byStatus[s._id] = { count: s.count, amountPaise: s.amount }
        const totalOrders = statusAgg.reduce((sum, s) => sum + s.count, 0)

        return res.status(200).json({
            success: true,
            stats: {
                byStatus,
                byPlan: planAgg.map(p => ({ plan: p._id, orders: p.count, amountRupees: Math.round(p.amount / 100) })),
                failureRate: totalOrders ? Number((((byStatus.failed?.count || 0) / totalOrders) * 100).toFixed(1)) : 0,
                mrrRupees: Math.round((mrrAgg[0]?.amount || 0) / 100),
                mrrOrders: mrrAgg[0]?.count || 0,
            },
            payments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        })
    } catch (error) {
        (req.log || logger).error('get payments failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the payments',
        })
    }
}

// GET /admin/ai — the AI cost & health monitor sir
exports.getAiStats = async (req, res) => {
    try {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const [today, byPlan, byType, perDay, recentErrors] = await Promise.all([
            // last 24h headline numbers sir
            AiLog.aggregate([
                { $match: { createdAt: { $gte: dayAgo } } },
                {
                    $group: {
                        _id: null,
                        calls: { $sum: 1 },
                        tokens: { $sum: '$totalTokens' },
                        avgLatencyMs: { $avg: '$latencyMs' },
                        failures: { $sum: { $cond: ['$success', 0, 1] } },
                    }
                }
            ]),
            // per-tier cost tracking sir — which plan burns the tokens
            AiLog.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: '$plan',
                        calls: { $sum: 1 },
                        tokens: { $sum: '$totalTokens' },
                        avgLatencyMs: { $avg: '$latencyMs' },
                    }
                }
            ]),
            // review vs chat split sir
            AiLog.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: '$type', calls: { $sum: 1 }, tokens: { $sum: '$totalTokens' } } }
            ]),
            // 30-day series for the tokens/latency graph sir
            AiLog.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        calls: { $sum: 1 },
                        tokens: { $sum: '$totalTokens' },
                        avgLatencyMs: { $avg: '$latencyMs' },
                        failures: { $sum: { $cond: ['$success', 0, 1] } },
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // the last 10 failures for the error panel sir
            AiLog.find({ success: false })
                .select('type plan error latencyMs createdAt')
                .sort({ createdAt: -1 })
                .limit(10),
        ])

        const t = today[0] || { calls: 0, tokens: 0, avgLatencyMs: 0, failures: 0 }

        return res.status(200).json({
            success: true,
            today: {
                calls: t.calls,
                tokens: t.tokens,
                avgLatencyMs: Math.round(t.avgLatencyMs || 0),
                errorRate: t.calls ? Number(((t.failures / t.calls) * 100).toFixed(1)) : 0,
            },
            last30Days: {
                byPlan,
                byType,
                perDay,
            },
            recentErrors
        })
    } catch (error) {
        (req.log || logger).error('get ai stats failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the AI stats',
        })
    }
}

// GET /admin/ai/by-user — which USERS are actually burning the tokens, 30-day window sir.
// Deliberately TOKEN volume, not a dollar figure — see AiModel.js's own comment, this app runs
// on Groq's free tier right now, so a dollar-per-token cost would be fabricated, not real. This
// is the honest version of "is a plan tier unprofitable": raw consumption per account, which is
// what would need re-checking against real pricing the day this app ever leaves the free tier.
// Also grouped by plan so a Basic account burning Pro-level tokens stands out immediately.
exports.getAiUsageByUser = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const [byUser, byPlanAvg] = await Promise.all([
            AiLog.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, user: { $ne: null } } },
                {
                    $group: {
                        _id: '$user',
                        calls: { $sum: 1 },
                        tokens: { $sum: '$totalTokens' },
                        plan: { $last: '$plan' },
                    },
                },
                { $sort: { tokens: -1 } },
                { $limit: 25 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userDoc',
                        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
                    },
                },
                { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        calls: 1,
                        tokens: 1,
                        plan: 1,
                        firstName: '$userDoc.firstName',
                        lastName: '$userDoc.lastName',
                        email: '$userDoc.email',
                    },
                },
            ]),
            // per-plan average tokens/user sir — the baseline the top-25 list above is judged
            // against ("is this ONE user way above their plan's normal usage")
            AiLog.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, user: { $ne: null } } },
                { $group: { _id: { user: '$user', plan: '$plan' }, tokens: { $sum: '$totalTokens' } } },
                { $group: { _id: '$_id.plan', avgTokensPerUser: { $avg: '$tokens' }, users: { $sum: 1 } } },
            ]),
        ])

        return res.status(200).json({
            success: true,
            usage: {
                topUsers: byUser.map((u) => ({
                    _id: u._id,
                    name: u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null,
                    email: u.email || null,
                    plan: u.plan,
                    calls: u.calls,
                    tokens: u.tokens,
                })),
                byPlanAverage: byPlanAvg.map((p) => ({
                    plan: p._id,
                    avgTokensPerUser: Math.round(p.avgTokensPerUser),
                    users: p.users,
                })),
            },
        })
    } catch (error) {
        (req.log || logger).error('get ai usage by user failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting per-user AI usage',
        })
    }
}

// GET /admin/health — green/red dots for the dashboard sir
exports.getHealth = async (req, res) => {
    try {
        // served straight from cache if still fresh sir — see HEALTH_CACHE_MS above
        if (healthCache.data && healthCache.expiresAt > Date.now()) {
            return res.status(200).json({ success: true, health: healthCache.data, cached: true })
        }

        // DB ping sir — timed
        let db = { ok: false, latencyMs: null }
        try {
            const t0 = Date.now()
            await mongoose.connection.db.admin().ping()
            db = { ok: true, latencyMs: Date.now() - t0 }
        } catch (dbErr) {
            db.error = dbErr.message
        }

        // DB connection pool sir — current pool size + how many are checked out right now,
        // straight off the driver's topology, no extra call needed
        const poolStats = (() => {
            try {
                const topology = mongoose.connection.client.topology
                const server = [...topology.s.servers.values()][0]
                const pool = server?.pool
                return pool
                    ? { totalConnections: pool.totalConnectionCount, availableConnections: pool.availableConnectionCount }
                    : null
            } catch {
                return null
            }
        })()

        // Groq reachability sir — a cheap models.list, timed
        let ai = { ok: false, latencyMs: null }
        try {
            const t0 = Date.now()
            await grok.models.list()
            ai = { ok: true, latencyMs: Date.now() - t0 }
        } catch (aiErr) {
            ai.error = aiErr.message
        }

        // mail relay reachability sir — Render blocks outbound SMTP so production mail hops
        // through the Vercel relay (see utils/Nodemailer.js); a plain reachability probe on
        // the relay's base URL is enough, we don't want to actually send an email per health check
        let mail = { ok: false, configured: false }
        if (process.env.MAIL_RELAY_URL) {
            mail.configured = true
            try {
                const t0 = Date.now()
                const response = await fetch(process.env.MAIL_RELAY_URL, {
                    method: 'GET',
                    signal: AbortSignal.timeout(8000),
                })
                // any response at all (even a 404/405 on a GET the relay doesn't support) means
                // the relay is reachable sir — we're only checking network path, not the route
                mail = { ok: response.status < 500, configured: true, latencyMs: Date.now() - t0, statusCode: response.status }
            } catch (mailErr) {
                mail.error = mailErr.message
            }
        } else {
            mail.note = 'MAIL_RELAY_URL not set — relay not configured for this environment'
        }

        const mem = process.memoryUsage()

        // event-loop lag sir — mean/max lag in ms since the process started, the earlier the
        // server started struggling to keep up, the higher this drifts even if memory looks fine
        const eventLoop = {
            meanMs: Math.round((eventLoopMonitor.mean / 1e6) * 100) / 100,
            maxMs: Math.round((eventLoopMonitor.max / 1e6) * 100) / 100,
        }

        // env sanity sir — flags missing config before it surfaces as a confusing failure elsewhere
        const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

        // overall rollup sir — down if the DB is unreachable (nothing works without it),
        // degraded if AI/mail is unreachable or env vars are missing (partial functionality),
        // healthy otherwise
        const overall = !db.ok
            ? 'down'
            : (!ai.ok || (mail.configured && !mail.ok) || missingEnvVars.length > 0)
                ? 'degraded'
                : 'healthy'

        const health = {
            overall,
            db: poolStats ? { ...db, pool: poolStats } : db,
            ai,
            mail,
            eventLoop,
            env: {
                ok: missingEnvVars.length === 0,
                missing: missingEnvVars,
            },
            server: {
                uptimeSeconds: Math.round(process.uptime()),
                memoryMB: {
                    rss: Math.round(mem.rss / 1024 / 1024),
                    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                },
                node: process.version,
            }
        }

        healthCache = { data: health, expiresAt: Date.now() + HEALTH_CACHE_MS }

        return res.status(200).json({
            success: true,
            health,
        })
    } catch (error) {
        (req.log || logger).error('get health failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while checking the health',
        })
    }
}

// GET /admin/insights — aggregate product insights sir
exports.getInsights = async (req, res) => {
    try {
        const [topJds, scoreByPlan, topMissingKeywords] = await Promise.all([
            // most-targeted job titles sir
            Review.aggregate([
                { $group: { _id: '$jdTitle', count: { $sum: 1 }, avgScore: { $avg: '$atsScore' } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, jdTitle: '$_id', count: 1, avgScore: { $round: ['$avgScore', 0] } } }
            ]),
            // do paid users score better sir
            Review.aggregate([
                { $group: { _id: '$plan', count: { $sum: 1 }, avgScore: { $avg: '$atsScore' } } },
                { $project: { _id: 0, plan: '$_id', count: 1, avgScore: { $round: ['$avgScore', 0] } } }
            ]),
            // the most common missing keywords across ALL resumes sir — a genuinely publishable insight
            Review.aggregate([
                { $unwind: '$review.missingKeywords' },
                { $group: { _id: { $toLower: '$review.missingKeywords' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 },
                { $project: { _id: 0, keyword: '$_id', count: 1 } }
            ]),
        ])

        return res.status(200).json({
            success: true,
            insights: {
                topJobDescriptions: topJds,
                scoreByPlan,
                topMissingKeywords,
            }
        })
    } catch (error) {
        (req.log || logger).error('get insights failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the insights',
        })
    }
}

// GET /admin/traffic?range=day|week|month — unique visitors + logins sir, the traffic chart on Overview
// "day" buckets hourly (last 24h), "week"/"month" bucket daily (last 7 / last 30 days)
exports.getTraffic = async (req, res) => {
    try {
        const range = ['day', 'week', 'month'].includes(req.query.range) ? req.query.range : 'week'

        const rangeConfig = {
            day: { since: new Date(Date.now() - 24 * 60 * 60 * 1000), format: '%Y-%m-%d %H:00', unit: 'hour' },
            week: { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), format: '%Y-%m-%d', unit: 'day' },
            month: { since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), format: '%Y-%m-%d', unit: 'day' },
        }
        const { since, format } = rangeConfig[range]

        const [visitorSeries, loginSeries, uniqueIpAgg, totalVisitors, totalLogins] = await Promise.all([
            // new unique visitors per bucket sir — one row per first-ever visit, so this IS unique visitors
            VisitorLog.aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // logins per bucket sir — same user logging in twice counts twice, this is activity not uniqueness
            LoginLog.aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // distinct IPs seen logging in during the window sir — a second, IP-based uniqueness cut
            LoginLog.aggregate([
                { $match: { createdAt: { $gte: since }, ip: { $ne: null } } },
                { $group: { _id: '$ip' } },
                { $count: 'count' },
            ]),
            VisitorLog.countDocuments({ createdAt: { $gte: since } }),
            LoginLog.countDocuments({ createdAt: { $gte: since } }),
        ])

        return res.status(200).json({
            success: true,
            range,
            summary: {
                uniqueVisitors: totalVisitors,
                logins: totalLogins,
                uniqueLoginIps: uniqueIpAgg[0]?.count || 0,
            },
            series: {
                visitors: visitorSeries.map((v) => ({ bucket: v._id, count: v.count })),
                logins: loginSeries.map((l) => ({ bucket: l._id, count: l.count })),
            },
        })
    } catch (error) {
        (req.log || logger).error('get traffic failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the traffic stats',
        })
    }
}

// GET /admin/audit?page=1&limit=50&action=USER_BAN&search=foo&export=true — the audit trail sir, admin only
// search matches the target's email — the actor's email can't be filtered server-side since
// it only becomes available after the actor populate, so we match on actor email post-populate too.
// export=true ignores paging and returns every matching row (capped at EXPORT_CAP) so the CSV
// export button can grab everything matching the current filter, not just the visible page.
const EXPORT_CAP = 5000

exports.getAuditLogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
        const action = req.query.action
        const search = (req.query.search || '').trim()
        const isExport = req.query.export === 'true'

        const filter = {}
        if (action) filter.action = action
        if (search) {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const matchingActors = await User.find({ email: { $regex: safe, $options: 'i' } }).select('_id')
            filter.$or = [
                { targetEmail: { $regex: safe, $options: 'i' } },
                { actor: { $in: matchingActors.map((u) => u._id) } },
            ]
        }

        if (isExport) {
            const [logs, total] = await Promise.all([
                AuditLog.find(filter)
                    .populate('actor', 'firstName lastName email role')
                    .sort({ createdAt: -1 })
                    .limit(EXPORT_CAP),
                AuditLog.countDocuments(filter),
            ])

            return res.status(200).json({
                success: true,
                logs,
                truncated: total > EXPORT_CAP,
                total,
            })
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('actor', 'firstName lastName email role')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            AuditLog.countDocuments(filter),
        ])

        return res.status(200).json({
            success: true,
            logs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        })
    } catch (error) {
        (req.log || logger).error('get audit logs failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the audit logs',
        })
    }
}

// GET /admin/deletions — visibility into the silent 2-day account-purge cron sir
// (AccountPurgeCron.js): who's currently pending, and who it's purged recently.
// Purge history only goes back to when AccountPurgeCron started writing ACCOUNT_PURGED
// audit entries — purges from before that were never recorded (no tombstone existed).
exports.getDeletions = async (req, res) => {
    try {
        const [pending, recentPurges, purgedLast30Days, recentCostAlert] = await Promise.all([
            // still inside the 2-day recovery window sir — Buffer: true, not yet purged
            User.find({ Buffer: true })
                .select('email BufferTiming')
                .sort({ BufferTiming: 1 }),
            // last 20 purge events sir, newest first
            AuditLog.find({ action: 'ACCOUNT_PURGED' })
                .sort({ createdAt: -1 })
                .limit(20),
            AuditLog.countDocuments({
                action: 'ACCOUNT_PURGED',
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            }),
            // most recent AI cost-alert firing sir (AiCostAlert.js), so the dashboard shows
            // it even though that cron previously only ever sent an email
            AuditLog.findOne({
                action: 'AI_COST_ALERT',
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            }).sort({ createdAt: -1 }),
        ])

        return res.status(200).json({
            success: true,
            deletions: {
                pendingCount: pending.length,
                pending,
                purgedLast30Days,
                recentPurges,
                recentCostAlert,
            }
        })
    } catch (error) {
        (req.log || logger).error('get deletions failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the deletion stats',
        })
    }
}

// GET /admin/reconciliation — visibility into the credit-spend safety net sir
// (Models/CreditSpend.js + utils/CreditReconcileCron.js): every AI credit spend writes a
// short-lived ledger entry right after consumeCredit succeeds, resolved the moment the AI call
// either produces a saved artifact or is refunded. Anything still "pending" past the cron's
// 10-minute grace window means the process crashed mid-request — this is where an admin sees
// that a customer was refunded (or SHOULD have been, if currently pending) without ever having
// to be told about it by a support ticket.
exports.getReconciliation = async (req, res) => {
    try {
        const [pending, recentRefunds, refundedLast30Days] = await Promise.all([
            // still inside the grace window sir — not necessarily orphaned yet, just spent and
            // waiting on its artifact; only entries older than ~10 minutes are true crash orphans
            CreditSpend.find({})
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: 1 })
                .limit(50),
            // last 20 auto-refund events sir, newest first
            AuditLog.find({ action: 'CREDIT_RECONCILED' })
                .populate('targetUser', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(20),
            AuditLog.countDocuments({
                action: 'CREDIT_RECONCILED',
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            }),
        ])

        const graceMs = 10 * 60 * 1000
        const now = Date.now()
        const withOrphanFlag = pending.map((entry) => ({
            ...entry.toObject(),
            isOrphaned: now - entry.createdAt.getTime() > graceMs,
        }))

        return res.status(200).json({
            success: true,
            reconciliation: {
                pendingCount: pending.length,
                pending: withOrphanFlag,
                refundedLast30Days,
                recentRefunds,
            }
        })
    } catch (error) {
        (req.log || logger).error('get reconciliation failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the reconciliation stats',
        })
    }
}

// GET /admin/at-risk — paying subscribers going quiet sir, the churn signal that previously had
// zero dashboard visibility even though StreakCron.js's sendWinBackNudges already emails
// inactive users blind (14-day threshold, ALL plans, no admin ever sees who's actually on it).
// This surfaces the SAME 14-day inactivity signal but split by whether the user is a paying
// subscriber right now (Subscription: true) — a quiet ProMax account is a revenue-at-risk
// signal worth an admin's attention, a quiet free Basic account is just normal churn.
exports.getAtRiskUsers = async (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

        const [payingAtRisk, freeInactive] = await Promise.all([
            // paying + quiet 7+ days sir — the same feature they're being billed for going unused
            // is the strongest early churn signal, well before the free-tier 14-day nudge fires
            User.find({
                Subscription: true,
                isBanned: { $ne: true },
                $or: [
                    { lastActivityDate: { $lt: sevenDaysAgo } },
                    { lastActivityDate: { $exists: false } },
                ],
            })
                .select('firstName lastName email SubType SubscriptionExpires lastActivityDate')
                .sort({ lastActivityDate: 1 })
                .limit(50),
            // free + quiet 14+ days sir — same threshold sendWinBackNudges already emails on,
            // just finally visible here instead of only ever reaching the user's inbox
            User.countDocuments({
                Subscription: false,
                isBanned: { $ne: true },
                $or: [
                    { lastActivityDate: { $lt: fourteenDaysAgo } },
                    { lastActivityDate: { $exists: false } },
                ],
            }),
        ])

        return res.status(200).json({
            success: true,
            atRisk: {
                payingCount: payingAtRisk.length,
                paying: payingAtRisk,
                freeInactiveCount: freeInactive,
            },
        })
    } catch (error) {
        (req.log || logger).error('get at-risk users failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting at-risk users',
        })
    }
}

// GET /admin/referral-abuse — the referral program's own abuse guard (MAX_REFERRALS_PER_USER in
// controllers/user.js caps payouts at 10 per referrer, specifically to stop "two colluding
// accounts... loop signup+login indefinitely for free credits", per that file's own comment) had
// zero admin visibility into who's actually anywhere near triggering it. This surfaces three real
// signals from data already collected, no new tracking added: (1) referrers close to/at the cap,
// (2) referrers whose invited accounts got banned afterward — the strongest signal, since a fake
// account created purely to farm a referral bonus is exactly the kind of account that gets banned
// once noticed, (3) referral velocity — many payouts in a short window, the exact
// signup+login-loop pattern MAX_REFERRALS_PER_USER exists to blunt.
exports.getReferralAbuseSignals = async (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const [nearCap, bannedReferredCounts, velocity] = await Promise.all([
            // referralCount is only ever bumped for a credit-earning referral sir (see
            // grantReferralBonus) — this is the cap defined in controllers/user.js, duplicated
            // here as a literal since that file doesn't export it standalone
            User.find({ referralCount: { $gte: 7 } })
                .select('firstName lastName email referralCount')
                .sort({ referralCount: -1 })
                .limit(25),
            // group ReferralLog by referrer, join each referred account's CURRENT ban status sir
            // — a referrer whose invitees keep getting banned is the strongest abuse signal here
            ReferralLog.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'referredUser',
                        foreignField: '_id',
                        as: 'referredDoc',
                        pipeline: [{ $project: { isBanned: 1 } }],
                    },
                },
                { $unwind: { path: '$referredDoc', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$referrer',
                        totalReferred: { $sum: 1 },
                        bannedReferred: { $sum: { $cond: [{ $eq: ['$referredDoc.isBanned', true] }, 1, 0] } },
                    },
                },
                { $match: { bannedReferred: { $gt: 0 } } },
                { $sort: { bannedReferred: -1 } },
                { $limit: 25 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'referrerDoc',
                        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
                    },
                },
                { $unwind: { path: '$referrerDoc', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        totalReferred: 1,
                        bannedReferred: 1,
                        firstName: '$referrerDoc.firstName',
                        lastName: '$referrerDoc.lastName',
                        email: '$referrerDoc.email',
                    },
                },
            ]),
            // 3+ successful referrals inside 7 days sir — one person genuinely inviting their
            // whole team in a week is rare; this is a "look closer", not an auto-ban list
            ReferralLog.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo }, bonusCredits: { $gt: 0 } } },
                { $group: { _id: '$referrer', count: { $sum: 1 } } },
                { $match: { count: { $gte: 3 } } },
                { $sort: { count: -1 } },
                { $limit: 25 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'referrerDoc',
                        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
                    },
                },
                { $unwind: { path: '$referrerDoc', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        firstName: '$referrerDoc.firstName',
                        lastName: '$referrerDoc.lastName',
                        email: '$referrerDoc.email',
                    },
                },
            ]),
        ])

        return res.status(200).json({
            success: true,
            referralAbuse: {
                nearCap,
                bannedReferredReferrers: bannedReferredCounts,
                highVelocity: velocity,
            },
        })
    } catch (error) {
        (req.log || logger).error('get referral abuse signals failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting referral abuse signals',
        })
    }
}

// GET /admin/security — visibility into account lockouts sir, the one abuse signal that
// previously had zero dashboard presence despite the underlying protection already existing
// (per-account lockout in controllers/user.js, IP rate limiters in Middlewares/RateLimit.js —
// the IP limiters are in-memory and reset on restart, so there's nothing durable to show for
// those; ACCOUNT_LOCKOUT audit entries are the one persisted abuse signal we have)
exports.getSecurity = async (req, res) => {
    try {
        const [currentlyLocked, recentLockouts, lockoutsLast7Days] = await Promise.all([
            // still locked right now sir — lockUntil in the future
            User.find({ lockUntil: { $gt: new Date() } })
                .select('email lockUntil')
                .sort({ lockUntil: -1 }),
            // last 20 lockout events sir, newest first
            AuditLog.find({ action: 'ACCOUNT_LOCKOUT' })
                .sort({ createdAt: -1 })
                .limit(20),
            AuditLog.countDocuments({
                action: 'ACCOUNT_LOCKOUT',
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }),
        ])

        return res.status(200).json({
            success: true,
            security: {
                currentlyLockedCount: currentlyLocked.length,
                currentlyLocked,
                lockoutsLast7Days,
                recentLockouts,
            }
        })
    } catch (error) {
        (req.log || logger).error('get security failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the security stats',
        })
    }
}

// GET /admin/search?q=... — one bar to find a user or a payment sir, instead of hunting
// through each page's own filter. Scoped to Users + Payments only since those are the only
// two admin pages a result can actually be deep-linked into today (chats/reviews have no
// standalone admin page yet, just the read-only summary inside the user detail drawer).
exports.getGlobalSearch = async (req, res) => {
    try {
        const q = (req.query.q || '').trim()
        if (q.length < 2) {
            return res.status(200).json({ success: true, users: [], payments: [] })
        }

        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = { $regex: safe, $options: 'i' }

        const userFilter = {
            role: { $ne: 'Admin' },
            $or: [{ email: regex }, { firstName: regex }, { lastName: regex }],
        }

        const [users, matchingUserIds] = await Promise.all([
            User.find(userFilter)
                .select('firstName lastName email role isBanned SubType')
                .sort({ createdAt: -1 })
                .limit(8),
            // a payment doesn't store the buyer's email itself sir, so a search like
            // "faizan@" only turns up payments via this separate user lookup
            User.find({ $or: [{ email: regex }, { firstName: regex }, { lastName: regex }] }).select('_id'),
        ])

        const payments = await Payment.find({
            $or: [
                { orderId: regex },
                { paymentId: regex },
                { user: { $in: matchingUserIds.map((u) => u._id) } },
            ],
        })
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(8)

        return res.status(200).json({ success: true, users, payments })
    } catch (error) {
        (req.log || logger).error('get global search failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while searching',
        })
    }
}
