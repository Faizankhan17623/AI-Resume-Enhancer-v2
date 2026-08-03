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
//   - standalone   -> runs the same callback with session:undefined, logging a warning once
//
// Callers pass the session into every query they make (`.session(session)` or `{ session }`),
// which is a no-op when session is undefined. That way ONE code path serves both environments
// and production still gets true atomicity.

const mongoose = require('mongoose')
const logger = require('./logger')

// cached across calls sir — the topology doesn't change while the process is alive
let transactionsSupported = null
let warnedOnce = false

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
        if (!warnedOnce && process.env.NODE_ENV === 'production') {
            warnedOnce = true
            // production on a standalone is a real durability risk sir — say so loudly, once
            logger.warn('MongoDB deployment does not support transactions; multi-document writes are NOT atomic. Use a replica set (Atlas does this by default) in production.')
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
