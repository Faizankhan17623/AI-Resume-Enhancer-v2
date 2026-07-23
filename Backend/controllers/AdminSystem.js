const mongoose = require('mongoose')
const Grok = require('groq-sdk')

const User = require('../Models/User')
const Payment = require('../Models/Payment')
const Review = require('../Models/Review')
const AiLog = require('../Models/AiLog')
const AuditLog = require('../Models/AuditLog')
const LoginLog = require('../Models/LoginLog')
const VisitorLog = require('../Models/VisitorLog')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY })

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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the AI stats',
        })
    }
}

// GET /admin/health — green/red dots for the dashboard sir
exports.getHealth = async (req, res) => {
    try {
        // DB ping sir — timed
        let db = { ok: false, latencyMs: null }
        try {
            const t0 = Date.now()
            await mongoose.connection.db.admin().ping()
            db = { ok: true, latencyMs: Date.now() - t0 }
        } catch (dbErr) {
            db.error = dbErr.message
        }

        // Groq reachability sir — a cheap models.list, timed
        let ai = { ok: false, latencyMs: null }
        try {
            const t0 = Date.now()
            await grok.models.list()
            ai = { ok: true, latencyMs: Date.now() - t0 }
        } catch (aiErr) {
            ai.error = aiErr.message
        }

        const mem = process.memoryUsage()

        return res.status(200).json({
            success: true,
            health: {
                db,
                ai,
                server: {
                    uptimeSeconds: Math.round(process.uptime()),
                    memoryMB: {
                        rss: Math.round(mem.rss / 1024 / 1024),
                        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                    },
                    node: process.version,
                }
            }
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the traffic stats',
        })
    }
}

// GET /admin/audit?page=1&limit=50&action=USER_BAN — the audit trail sir, admin only
exports.getAuditLogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
        const action = req.query.action

        const filter = {}
        if (action) filter.action = action

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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the deletion stats',
        })
    }
}
