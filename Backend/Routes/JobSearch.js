const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { searchJobs } = require('../controllers/JobSearch.js')

// live web job search via Tavily sir — Pro+ feature, gated inside the controller

route.post('/job-search', aiLimiter, Auth, searchJobs)

module.exports = route
