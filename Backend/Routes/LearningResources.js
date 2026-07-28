const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { getLearningResources } = require('../controllers/LearningResources.js')

// real course/tutorial results for one learningRoadmap resourceQuery sir — Pro+ feature,
// gated inside the controller. isUser blocks Admin/Support too, this is a product feature.

route.post('/learning-resources', aiLimiter, Auth, isUser, getLearningResources)

module.exports = route
