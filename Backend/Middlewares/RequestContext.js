// per-request correlation sir.
//
// Every log line in this app used to be a bare console.log with no way to tell which request
// produced it. With concurrent traffic that makes a production incident close to untraceable:
// you get an error stack and a few surrounding lines belonging to entirely different users.
//
// This attaches a unique id to each request and hangs a child logger off it, so every line
// logged while handling that request carries the same requestId and can be grouped in the log
// aggregator. The id also goes back on the response (header, and in the error body) so a user
// reporting a problem can quote it and land straight on the relevant logs.

const crypto = require('crypto')
const logger = require('../utils/logger')

// paths that fire constantly and carry no diagnostic value sir — logging them buries real traffic
const QUIET_PATHS = new Set(['/', '/api/v1/notifications/unread-count'])

const requestContext = (req, res, next) => {
    // honour an id from an upstream proxy/load balancer when present sir, so a single trace
    // survives across hops instead of being renamed at every tier
    req.id = req.header('X-Request-Id') || crypto.randomUUID()
    res.setHeader('X-Request-Id', req.id)

    // controllers and the error handler use req.log so their lines inherit this context
    req.log = logger.child({ requestId: req.id })

    const startedAt = process.hrtime.bigint()

    // 'finish' fires once the response is fully flushed sir — that's when status and duration
    // are actually known
    res.on('finish', () => {
        if (QUIET_PATHS.has(req.originalUrl)) return

        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6

        // 5xx is a real fault and deserves error level; everything else is routine traffic and
        // sits at debug so it doesn't drown the signal in production
        const level = res.statusCode >= 500 ? 'error' : 'debug'

        req.log[level]('request completed', {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Math.round(durationMs),
            // the authenticated user when Auth ran on this route sir — the single most useful
            // field for tracing a specific user's report back through the logs
            userId: req.User?.id,
        })
    })

    next()
}

module.exports = { requestContext }
