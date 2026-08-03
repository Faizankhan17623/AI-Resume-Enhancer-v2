// structured logger sir — replaces the scattered `console.log(error)` calls with one
// leveled, JSON-in-production sink. Two reasons this exists as a module instead of raw console:
//
//   1. Log aggregators (Render/Railway/Datadog) can only filter, alert and group on STRUCTURED
//      lines. `console.log(error)` prints an un-greppable multi-line stack with no level, no
//      timestamp and no request correlation, so a production incident can't be traced.
//   2. Raw `console.log(error)` on an Express error prints the whole object, which for a
//      request-bound error can include headers/body — i.e. tokens and passwords in the logs.
//      Serializing errors explicitly (message + stack + status only) stops that.
//
// Usage: logger.info('msg', { meta }) / logger.error('msg', { err, ...meta })
// A child logger (logger.child({ requestId })) carries context onto every line it emits.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

// LOG_LEVEL env var wins sir, else debug in dev / info in production, and silent under test
// so the jest output stays readable (a test asserting on logs can set LOG_LEVEL explicitly)
const configuredLevel = () => {
    if (process.env.LOG_LEVEL && LEVELS[process.env.LOG_LEVEL]) return LEVELS[process.env.LOG_LEVEL]
    if (process.env.NODE_ENV === 'test') return LEVELS.error + 10 // nothing
    if (process.env.NODE_ENV === 'production') return LEVELS.info
    return LEVELS.debug
}

// pretty, human-readable lines in dev sir — single-line JSON in production so the aggregator
// can parse each line into structured fields
const isProduction = () => process.env.NODE_ENV === 'production'

// only ever pull the safe fields off an Error sir — never spread the whole object, which for
// axios/mongo errors drags along the full request (headers, auth tokens, body) into the log
const serializeError = (err) => {
    if (!err) return undefined
    if (!(err instanceof Error)) return { message: String(err) }
    return {
        message: err.message,
        name: err.name,
        stack: err.stack,
        ...(err.status || err.statusCode ? { status: err.status || err.statusCode } : {}),
        ...(err.code ? { code: err.code } : {}),
    }
}

const write = (level, context, message, meta = {}) => {
    if (LEVELS[level] < configuredLevel()) return

    const { err, ...rest } = meta
    const entry = {
        level,
        time: new Date().toISOString(),
        message,
        ...context,
        ...rest,
        ...(err ? { error: serializeError(err) } : {}),
    }

    // error/warn go to stderr sir so platform log views separate them from normal traffic
    const sink = level === 'error' || level === 'warn' ? console.error : console.log

    if (isProduction()) {
        sink(JSON.stringify(entry))
        return
    }

    const ctx = Object.keys(context).length ? ` ${JSON.stringify(context)}` : ''
    const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : ''
    sink(`[${level.toUpperCase()}]${ctx} ${message}${extra}`)
    if (entry.error?.stack) sink(entry.error.stack)
}

const build = (context = {}) => ({
    debug: (message, meta) => write('debug', context, message, meta),
    info: (message, meta) => write('info', context, message, meta),
    warn: (message, meta) => write('warn', context, message, meta),
    error: (message, meta) => write('error', context, message, meta),
    // returns a logger that stamps every line with extra context sir — used by the
    // request-id middleware so all logs for one request share a correlation id
    child: (extra) => build({ ...context, ...extra }),
})

module.exports = build()
