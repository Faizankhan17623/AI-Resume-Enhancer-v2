const express = require('express')
const route = express.Router()
const { trackVisit } = require('../controllers/Visitor.js')

// anonymous first-visit tracking sir — public, no auth, the globalLimiter is enough since the
// frontend beacon only fires once per browser cookie

route.post('/track-visit', trackVisit)

module.exports = route
