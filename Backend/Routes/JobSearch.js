const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { searchJobs } = require('../controllers/JobSearch.js')

// live web job search via Tavily sir — Pro+ feature, gated inside the controller.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.post('/job-search', aiLimiter, Auth, isUser, searchJobs)

module.exports = route
