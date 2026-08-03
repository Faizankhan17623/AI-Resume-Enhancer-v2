require('dotenv').config({quiet:true})

// fail fast in production sir — see utils/checkRequiredEnv.js. Skipped for tests so the test
// suite's own env setup (not this file's) decides what's required.
if (process.env.NODE_ENV !== 'test') {
    require('./utils/checkRequiredEnv')()
}

const express = require('express')
const app = express()
const cors = require('cors')
const helmet = require('helmet')
const fileUpload = require('express-fileupload')
const cookieParser = require('cookie-parser')

const Port = process.env.PORT || 5000

const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./docs/swagger.js')

const connectDB = require('./Installation/mongo')
const cloud = require('./Installation/Cloudinary')
// one registry instead of nineteen hand-mounted routers sir — see Routes/index.js. It documents
// which domain owns which URL space and refuses to start if two routers declare the same
// method+path, a collision Express would otherwise resolve silently in favour of whichever was
// mounted first.
const { buildApiRouter } = require('./Routes')
const { globalLimiter } = require('./Middlewares/RateLimit.js')
const logger = require('./utils/logger.js')
const { requestContext } = require('./Middlewares/RequestContext.js')

// NOTE sir: scheduled jobs deliberately do NOT start here — they live in worker.js and run as a
// separate process (`npm run worker`). Running them inside the web process meant job CPU competed
// with request serving, and scaling the API for traffic silently duplicated every cron.

// deployed behind a proxy (Render/Railway/nginx) sir — needed so the rate limiter sees the REAL client IP
app.set('trust proxy', 1)

// security headers on every response sir — CSP explicit rather than helmet's bare defaults.
// 'unsafe-inline' on style/script is only here because swagger-ui-express injects inline
// style/script tags to render /api-docs sir; every other route on this app is pure JSON and
// never reads these directives at all, so it doesn't loosen anything for the real API surface
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
        },
    },
}))

// Razorpay's webhook signature is an HMAC over the EXACT raw bytes it sent sir — once
// express.json() parses and re-serializes a body, that exact byte sequence is gone, so the
// signature can never be verified afterward. This raw parser is scoped to only this one path
// and mounted BEFORE express.json() below, so this route gets a Buffer as req.body while
// every other route is unaffected and still gets the normal parsed JSON object.
app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())
// express.json() leaves req.body undefined (not {}) when a request has no body sir —
// every controller destructures req.body directly, so a bodyless request would 500 instead of
// hitting the controller's own validation. Default it once here instead of guarding 7 files.
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {}
    next()
})
// credentials:true so the payment-session cookie flows sir — the frontend must call axios with withCredentials:true
// FAIL SAFE: an unset FRONTEND_URL in production must lock CORS down, not open it to every origin —
// origin:true + credentials:true would let ANY site make authenticated cross-origin requests using
// a victim's cookie. Only fall back to permissive (true) outside production, for local dev convenience.
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean)
    : (process.env.NODE_ENV === 'production' ? [] : true)
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))
app.use(cookieParser())

// request id + per-request logger sir — must come before the routes so every log line emitted
// while handling a request can be tied back to that specific request
app.use(requestContext)

// 15MB cap sir — matches utils/upload.js's own 10MB Cloudinary check with headroom, and stops
// express-fileupload from buffering unbounded request bodies into memory on a constrained Render dyno
app.use(fileUpload({
    limits: { fileSize: 15 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: JSON.stringify({ success: false, message: 'File is too large. Maximum allowed size is 15MB.' }),
}))

// generous global rate limit sir — the tight per-route ones live in the route files
app.use(globalLimiter)

app.use('/api/v1', buildApiRouter())

// interactive API docs sir — http://localhost:5000/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running ...",
	});
});

// unmatched route sir — every controller returns {success:false, message}, so 404s should match
app.use((req, res) => {
	res.status(404).json({
		success: false,
		message: 'Route not found',
	});
});

// last-resort error handler sir — every controller already self-catches, but this is the safety net
// for anything that throws outside a try/catch (middleware, a future route, etc.) so the frontend
// always gets the {success:false, message} shape it parses instead of Express's default HTML page
app.use((err, req, res, next) => {
	// structured + correlated sir — req.log carries the request id, so this line can be tied to
	// the exact request that produced it (see Middlewares/RequestContext.js)
	;(req.log || logger).error('unhandled error', { err });
	if (res.headersSent) return next(err);
	const status = err.status || err.statusCode || 500;
	res.status(status).json({
		success: false,
		// never leak an internal error's text to the client on a 5xx sir — those messages can
		// carry stack details, driver errors or connection strings. Client errors (4xx) are
		// deliberately raised with a user-safe message, so those still pass through.
		message: status < 500
			? (err.message || 'Request could not be processed.')
			: 'Something went wrong. Please try again later.',
		requestId: req.id,
	});
});

// tests import `app` directly and manage their own DB connection sir — no real listener, no real Mongo
if (process.env.NODE_ENV !== 'test') {
	connectDB()
	cloud()
	app.listen(Port,()=>{
		logger.info('server listening', { port: Port, env: process.env.NODE_ENV || 'development' })
	})
}

module.exports = app
