const mongoose = require('mongoose')

// A short-lived ledger entry sir — written right after consumeCredit succeeds, and resolved
// (deleted) the moment the AI call either produces a saved artifact or the credit is refunded.
//
// WHY THIS EXISTS: the credit is spent BEFORE the Groq call, which can run for several seconds.
// A server crash, OOM-kill, or deploy restart while that call is in flight leaves the credit
// spent with nothing to show for it — every reachable in-process failure path already calls
// refundCredit, but a crash skips all of them since nothing after the crash point ever runs.
//
// A Mongo transaction can't fix this: you cannot put an external HTTP call to Groq inside a
// transaction and hold locks open across a multi-second network round trip. Instead this is a
// write-ahead marker: utils/CreditReconcileCron.js sweeps entries still `pending` past a grace
// window (comfortably longer than the Groq client's own 30s timeout) and refunds them — the
// same compensating action refundCredit already performs for every other failure path.
const CreditSpendSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // which feature spent the credit sir — purely for the reconcile job's log line, no
        // behavioural difference between kinds
        kind: {
            type: String,
            enum: ['review', 'resume-generate', 'resume-tailor'],
            required: true,
        },
    },
    { timestamps: true }
)

// the reconcile job's only query sir — every pending-past-the-grace-window sweep filters on this
CreditSpendSchema.index({ createdAt: 1 })

module.exports = mongoose.model('CreditSpend', CreditSpendSchema)
