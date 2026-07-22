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
    updateNotificationPrefs,
    completeOnboarding,
    forgotPassword,
    resetPassword,
    updatePassword,
    deleteAccount
} = require('../controllers/user.js')
const { googleLogin, googleCallback, exchangeGoogleCode } = require('../controllers/GoogleAuth.js')
// we are going to start the routing from here sir

// aiLimiter because every call here burns a Groq request + a credit sir
route.post('/response',aiLimiter,Auth,Calling)
route.post('/response/from-resume/:resumeId',aiLimiter,Auth,CallingFromSavedResume)

// authLimiter stops brute-force sir, otpLimiter stops email spam
route.post('/Createuser',authLimiter,createUser)
route.post('/Login',authLimiter,loginUser)
route.post('/Send-otp',otpLimiter,SendOtp)

// full-page redirect flow sir, not XHR — authLimiter still applies so the callback can't be hammered
route.get('/auth/google',authLimiter,googleLogin)
route.get('/auth/google/callback',authLimiter,googleCallback)
// the frontend calls this right after landing on /oauth/complete sir — trades the one-time
// code (all the redirect URL ever carries) for the real token, in the response body only
route.post('/auth/google/exchange',authLimiter,exchangeGoogleCode)

// authLimiter here too sir — stops the reset-email and reset-token endpoints being brute-forced
route.post('/forgot-password',authLimiter,forgotPassword)
route.post('/reset-password',authLimiter,resetPassword)
route.put('/change-password',Auth,updatePassword)
route.delete('/delete-account',Auth,deleteAccount)

// the account page reads everything from here sir
route.get('/profile',Auth,getProfile)
route.patch('/profile/notifications',Auth,updateNotificationPrefs)
route.patch('/profile/onboarding',Auth,completeOnboarding)

module.exports = route