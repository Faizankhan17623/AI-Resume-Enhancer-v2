// Credit-spend reconciliation sir.
//
// THE PROBLEM: reviewService.js#runReview and controllers/BuiltResume.js#generateResume/
// tailorResume all spend a credit via consumeCredit BEFORE calling Groq, then refund it in every
// reachable failure branch. That covers a rejected/malformed AI response, but not a hard process
// crash (OOM-kill, deploy restart, unhandled exception outside the try/catch) while the process
// is sitting on the multi-second await for Groq's response — nothing after the crash point ever
// runs, so the credit stays spent with no review/resume to show for it.
//
// This can't be a Mongo transaction: the AI call is an external HTTP request, and you cannot hold
// a transaction's session open across a multi-second network round trip to a third party.
//
// THE FIX: Models/CreditSpend.js is a write-ahead marker created right after consumeCredit
// succeeds and deleted the moment the matching artifact is saved OR the credit is refunded
// in-process. This job sweeps entries still sitting there past a grace window comfortably longer
// than the Groq client's own 30s timeout + one retry (see services/reviewService.js) — anything
// still pending at that point was orphaned by a crash, not a slow-but-alive request — and applies
// the exact same refundCredit compensating action the in-process failure paths already use.

const CreditSpend = require('../Models/CreditSpend')
const { refundCredit } = require('./Plans')
const { scheduleJob } = require('./scheduler')
const { logSystemAction } = require('./AdminLog')
const logger = require('./logger')

// 10 minutes sir — Groq's client is configured for a 30s timeout with 1 retry (worst case ~60s),
// so this has wide headroom before a still-in-flight, not-yet-crashed request could be mistaken
// for an orphan.
const GRACE_MS = 10 * 60 * 1000

const reconcileOrphanedCreditSpends = async () => {
    const cutoff = new Date(Date.now() - GRACE_MS)

    const orphaned = await CreditSpend.find({ createdAt: { $lt: cutoff } })

    for (const entry of orphaned) {
        await refundCredit(entry.user)
        await CreditSpend.deleteOne({ _id: entry._id })
        logger.warn('refunded an orphaned AI credit spend', {
            user: entry.user,
            kind: entry.kind,
            spentAt: entry.createdAt,
        })
        // AuditLog entry sir — same pattern as ACCOUNT_PURGED/AI_COST_ALERT, and what
        // AdminSystem.js's getCreditReconciliation reads back for the admin dashboard.
        // targetUser (not just targetEmail) so the dashboard can populate the user's current
        // name/email rather than freezing a snapshot at refund time.
        logSystemAction('CREDIT_RECONCILED', { _id: entry.user }, { kind: entry.kind, spentAt: entry.createdAt })
    }

    if (orphaned.length > 0) {
        logger.info('reconciled orphaned credit spends', { count: orphaned.length })
    }
    return orphaned.length
}

// every 5 minutes sir — the grace window is 10 minutes, so this catches an orphan within 15
// minutes of the crash at the latest, without hammering the collection
const startCreditReconcileCron = () => {
    scheduleJob({
        name: 'credit-reconcile',
        schedule: '*/5 * * * *',
        leaseMs: 5 * 60 * 1000,
        task: reconcileOrphanedCreditSpends,
    })
}

module.exports = { reconcileOrphanedCreditSpends, startCreditReconcileCron }
