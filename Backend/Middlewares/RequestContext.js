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

    // TEMP DEBUG LOGGING — commented out, not deleted, sir. This was added to diagnose the
    // Render "accepts connection then hangs forever" problem: a request that never finishes
    // never fires res.on('finish') below, so it produced zero log lines at all, and this
    // "request received" line at ARRIVAL was the only way to tell "never arrived" apart from
    // "arrived but got stuck". No longer needed now that the backend moved to EC2 and that
    // failure mode is gone — kept here, disabled, in case it's ever needed again for a similar
    // investigation. To re-enable: uncomment the block below AND bump `level` in res.on('finish')
    // back from 'debug' to 'info' (see that comment further down).
    //
    // if (!QUIET_PATHS.has(req.originalUrl)) {
    //     req.log.info('request received', { method: req.method, path: req.originalUrl })
    // }

    // 'finish' fires once the response is fully flushed sir — that's when status and duration
    // are actually known
    res.on('finish', () => {
        if (QUIET_PATHS.has(req.originalUrl)) return

        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6

        // 5xx is a real fault and deserves error level; everything else is routine traffic and
        // sits at debug so it doesn't drown the signal in production. (Was bumped to 'info'
        // alongside the TEMP DEBUG LOGGING above for the Render investigation — reverted back to
        // debug now that it's no longer needed; re-bump to 'info' only if re-enabling that too.)
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
