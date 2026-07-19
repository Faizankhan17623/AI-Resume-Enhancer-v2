const express = require('express')
const route = express.Router()
const { trackVisit } = require('../controllers/Visitor.js')
const { visitorLimiter } = require('../Middlewares/RateLimit.js')

// anonymous first-visit tracking sir — public, no auth, so it gets its own tight limiter
// on top of the globalLimiter since the frontend beacon only fires once per browser cookie

route.post('/track-visit', visitorLimiter, trackVisit)

module.exports = route
