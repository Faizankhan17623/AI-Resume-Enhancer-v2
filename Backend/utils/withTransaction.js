// multi-document write helper sir — the fix for the "user charged but never upgraded" class of bug.
//
// Several flows here write to more than one collection and MUST be all-or-nothing:
//   - payment activation: Payment(status:paid) + User(subscription fields)
//   - account deletion:   User(Buffer flags) + AuditLog
//   - credit spend:       User(count) + the artifact the credit paid for
// Without a transaction, a crash or connection blip between those writes leaves the DB in a
// state no code path can repair (money taken, plan not granted).
//
// The catch: MongoDB only supports transactions on a REPLICA SET or sharded cluster. A plain
// standalone mongod (a local dev install, and the default mongodb-memory-server used by the
// test suite) rejects startTransaction outright. Hard-requiring transactions would therefore
// break local dev and every test.
//
// So this helper probes support once, then:
//   - replica set  -> real transaction, real atomicity (production on Atlas)
//   - standalone   -> runs the same callback with session:undefined (dev/test only)
//
// IN PRODUCTION THE STANDALONE FALLBACK IS REFUSED, not warned about. A warn-once log line is
// invisible: it means a misconfigured deployment silently runs the payment path non-atomically
// and produces charged-but-not-upgraded users that nothing in the codebase can detect or repair.
// Losing atomicity on the money path is not a degraded mode worth serving, so production fails
// loudly at the first multi-document write instead. Set ALLOW_NON_TRANSACTIONAL_WRITES=true to
// deliberately override this (e.g. a self-hosted standalone deployment that accepts the risk).
//
// Callers pass the session into every query they make (`.session(session)` or `{ session }`),
// which is a no-op when session is undefined. That way ONE code path serves both environments
// and production still gets true atomicity.

const mongoose = require('mongoose')
const logger = require('./logger')

// cached across calls sir — the topology doesn't change while the process is alive
let transactionsSupported = null
let warnedOnce = false

// explicit, deliberate opt-out sir — must be set to the exact string 'true'
const nonTransactionalWritesAllowed = () =>
    process.env.ALLOW_NON_TRANSACTIONAL_WRITES === 'true'

// mongoose exposes the negotiated topology description once connected sir. 'ReplicaSetWithPrimary'
// and sharded ('Sharded') support transactions; 'Single' (standalone) does not.
const detectSupport = () => {
    try {
        const topology = mongoose.connection?.client?.topology
        const type = topology?.description?.type
        if (!type) return false
        return type === 'ReplicaSetWithPrimary' || type === 'ReplicaSetNoPrimary' || type === 'Sharded'
    } catch {
        return false
    }
}

const supportsTransactions = () => {
    if (transactionsSupported === null) transactionsSupported = detectSupport()
    return transactionsSupported
}

// test seam sir — lets a test force either path without standing up a replica set
const _setTransactionSupport = (value) => { transactionsSupported = value }

/**
 * Runs `fn(session)` inside a transaction when the deployment supports one.
 * `fn` MUST pass `session` to every query it issues, and MUST be safe to re-run:
 * Mongo can retry a transaction callback on a transient commit error.
 */
const withTransaction = async (fn) => {
    if (!supportsTransactions()) {
        if (process.env.NODE_ENV === 'production' && !nonTransactionalWritesAllowed()) {
            // refuse rather than silently corrupt sir — see the header. This surfaces as a 500
            // through the error handler, which is strictly better than taking a payment and
            // failing to grant the plan.
            logger.error('refusing multi-document write: MongoDB deployment does not support transactions. Use a replica set (Atlas does this by default), or set ALLOW_NON_TRANSACTIONAL_WRITES=true to accept the risk.')
            throw new Error('Database is not configured for atomic writes. This operation was refused to protect your data.')
        }

        if (!warnedOnce && process.env.NODE_ENV === 'production') {
            warnedOnce = true
            logger.warn('ALLOW_NON_TRANSACTIONAL_WRITES is set; multi-document writes are NOT atomic on this deployment.')
        }

        return fn(undefined)
    }

    const session = await mongoose.startSession()
    try {
        let result
        // withTransaction (not manual start/commit) sir — it handles the retryable
        // TransientTransactionError / UnknownTransactionCommitResult cases for us
        await session.withTransaction(async () => {
            result = await fn(session)
        })
        return result
    } finally {
        await session.endSession()
    }
}

module.exports = { withTransaction, supportsTransactions, _setTransactionSupport }
