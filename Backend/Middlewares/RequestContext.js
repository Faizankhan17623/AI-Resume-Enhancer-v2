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

    // logged at ARRIVAL, not just completion sir — added specifically because a request that
    // hangs forever (accepted, never answered) never fires res.on('finish') below, so it was
    // previously invisible in the logs no matter the LOG_LEVEL: no line ever got written for it
    // at all. This one line is the only way to tell "never arrived" apart from "arrived but got
    // stuck" when debugging exactly that symptom.
    if (!QUIET_PATHS.has(req.originalUrl)) {
        req.log.info('request received', { method: req.method, path: req.originalUrl })
    }

    // 'finish' fires once the response is fully flushed sir — that's when status and duration
    // are actually known
    res.on('finish', () => {
        if (QUIET_PATHS.has(req.originalUrl)) return

        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6

        // 5xx is a real fault and deserves error level; everything else is routine traffic sir —
        // bumped from debug to info (production's default LOG_LEVEL, see utils/logger.js) so
        // paired with the "request received" line above, every request's full lifecycle
        // (arrived -> completed-or-never) is visible on Render's log tail without having to
        // change LOG_LEVEL first. Still one level below error so a real fault stands out.
        const level = res.statusCode >= 500 ? 'error' : 'info'

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
