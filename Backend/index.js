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
const jobSearch = require('./Routes/JobSearch.js')
const { globalLimiter } = require('./Middlewares/RateLimit.js')
const { startStreakCron } = require('./utils/StreakCron.js')

// deployed behind a proxy (Render/Railway/nginx) sir — needed so the rate limiter sees the REAL client IP
app.set('trust proxy', 1)

// security headers on every response sir
app.use(helmet())

app.use(express.json())
// credentials:true so the payment-session cookie flows sir — the frontend must call axios with withCredentials:true
// FRONTEND_URL supports a comma-separated list, e.g. "https://myapp.vercel.app,http://localhost:5173"
// trailing slashes are stripped sir — an Origin header never has one, and a mismatch silently kills CORS
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean)
    : true
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
app.use('/api/v1',jobSearch)

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
	app.listen(Port,()=>{
		console.log(`Running on the port NUmber ${Port}`)
	})
}

module.exports = app