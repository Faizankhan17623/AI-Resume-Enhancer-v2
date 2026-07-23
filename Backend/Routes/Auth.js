const express = require('express')
const route = express.Router()
const {Calling, CallingFromSavedResume} = require('../controllers/AI')
const {Auth, isUser} = require('../Middlewares/Auth.js')
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
    updateFirstName,
    updateLastName,
    updateEmail,
    updateNumber,
    exportMyData,
    deleteAccount
} = require('../controllers/user.js')
const { googleLogin, googleCallback, exchangeGoogleCode } = require('../controllers/GoogleAuth.js')
const { facebookLogin, facebookCallback, exchangeFacebookCode } = require('../controllers/FacebookAuth.js')
const { githubLogin, githubCallback, exchangeGitHubCode } = require('../controllers/GitHubAuth.js')
const { linkedinLogin, linkedinCallback, exchangeLinkedInCode } = require('../controllers/LinkedInAuth.js')
// we are going to start the routing from here sir

// aiLimiter because every call here burns a Groq request + a credit sir.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only
route.post('/response',aiLimiter,Auth,isUser,Calling)
route.post('/response/from-resume/:resumeId',aiLimiter,Auth,isUser,CallingFromSavedResume)

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

route.get('/auth/facebook',authLimiter,facebookLogin)
route.get('/auth/facebook/callback',authLimiter,facebookCallback)
route.post('/auth/facebook/exchange',authLimiter,exchangeFacebookCode)

route.get('/auth/github',authLimiter,githubLogin)
route.get('/auth/github/callback',authLimiter,githubCallback)
route.post('/auth/github/exchange',authLimiter,exchangeGitHubCode)

route.get('/auth/linkedin',authLimiter,linkedinLogin)
route.get('/auth/linkedin/callback',authLimiter,linkedinCallback)
route.post('/auth/linkedin/exchange',authLimiter,exchangeLinkedInCode)

// authLimiter here too sir — stops the reset-email and reset-token endpoints being brute-forced
route.post('/forgot-password',authLimiter,forgotPassword)
route.post('/reset-password',authLimiter,resetPassword)
route.put('/change-password',Auth,updatePassword)
route.delete('/delete-account',Auth,deleteAccount)

// the account page reads everything from here sir
route.get('/profile',Auth,getProfile)
route.patch('/profile/notifications',Auth,updateNotificationPrefs)
route.patch('/profile/onboarding',Auth,completeOnboarding)
route.patch('/profile/first-name',Auth,updateFirstName)
route.patch('/profile/last-name',Auth,updateLastName)
route.patch('/profile/email',Auth,updateEmail)
route.patch('/profile/number',Auth,updateNumber)

// GDPR-style self-service data dump sir, separate from delete-account
route.get('/profile/export',Auth,exportMyData)

module.exports = route