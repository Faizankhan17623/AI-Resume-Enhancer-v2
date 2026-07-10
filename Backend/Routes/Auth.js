const express = require('express')
const route = express.Router()
const {Calling, CallingFromSavedResume} = require('../controllers/AI')
const {Auth} = require('../Middlewares/Auth.js')
const { authLimiter, otpLimiter, aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    createUser,
    loginUser,
    SendOtp,
    getProfile,
    updateNotificationPrefs
} = require('../controllers/user.js')
// we are going to start the routing from here sir

// aiLimiter because every call here burns a Groq request + a credit sir
route.post('/response',aiLimiter,Auth,Calling)
route.post('/response/from-resume/:resumeId',aiLimiter,Auth,CallingFromSavedResume)

// authLimiter stops brute-force sir, otpLimiter stops email spam
route.post('/Createuser',authLimiter,createUser)
route.post('/Login',authLimiter,loginUser)
route.post('/Send-otp',otpLimiter,SendOtp)

// the account page reads everything from here sir
route.get('/profile',Auth,getProfile)
route.patch('/profile/notifications',Auth,updateNotificationPrefs)

module.exports = route