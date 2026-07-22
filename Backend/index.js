require('dotenv').config({quiet:true})

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
const auth = require('./Routes/Auth.js')
const chat = require('./Routes/Chat.js')
const payment = require('./Routes/Payment.js')
const review = require('./Routes/Review.js')
const admin = require('./Routes/Admin.js')
const grammarCheck = require('./Routes/GrammarCheck.js')
const coverLetter = require('./Routes/CoverLetter.js')
const resume = require('./Routes/Resume.js')
const builtResume = require('./Routes/BuiltResume.js')
const jobSearch = require('./Routes/JobSearch.js')
const feedback = require('./Routes/Feedback.js')
const visitor = require('./Routes/Visitor.js')
const { globalLimiter } = require('./Middlewares/RateLimit.js')
const { startStreakCron } = require('./utils/StreakCron.js')
const { startAiCostAlertCron } = require('./utils/AiCostAlert.js')
const { startAccountPurgeCron } = require('./utils/AccountPurgeCron.js')

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
app.use(fileUpload())

// generous global rate limit sir — the tight per-route ones live in the route files
app.use(globalLimiter)

app.use('/api/v1',auth)
app.use('/api/v1',chat)
app.use('/api/v1',payment)
app.use('/api/v1',review)
app.use('/api/v1',admin)
app.use('/api/v1',grammarCheck)
app.use('/api/v1',coverLetter)
app.use('/api/v1',resume)
app.use('/api/v1',builtResume)
app.use('/api/v1',jobSearch)
app.use('/api/v1',feedback)
app.use('/api/v1',visitor)

// interactive API docs sir — http://localhost:5000/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running ...",
	});
});

// tests import `app` directly and manage their own DB connection sir — no real listener, no real Mongo
if (process.env.NODE_ENV !== 'test') {
	connectDB()
	cloud()
	startStreakCron()
	startAiCostAlertCron()
	startAccountPurgeCron()
	app.listen(Port,()=>{
		console.log(`Running on the port NUmber ${Port}`)
	})
}

module.exports = app