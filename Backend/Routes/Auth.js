const express = require('express')
const route = express.Router()
const {Calling, CallingFromSavedResume} = require('../controllers/AI')
const {Auth, isUser} = require('../Middlewares/Auth.js')
const { authLimiter, otpLimiter, aiLimiter } = require('../Middlewares/RateLimit.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    createUserSchema,
    loginSchema,
    sendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    updateFirstNameSchema,
    updateLastNameSchema,
    updateEmailSchema,
    updateNumberSchema,
    notificationPrefsSchema,
    recruiterApplicationSchema,
    appealSuspensionSchema,
} = require('../Validation/schemas.js')
const {
    createUser,
    loginUser,
    logoutUser,
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
    deleteAccount,
    applyForRecruiter,
    submitSuspensionAppeal
} = require('../controllers/user.js')
const { googleLogin, googleCallback, exchangeGoogleCode } = require('../controllers/GoogleAuth.js')
const { githubLogin, githubCallback, exchangeGitHubCode } = require('../controllers/GitHubAuth.js')
// we are going to start the routing from here sir

// aiLimiter because every call here burns a Groq request + a credit sir.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only
route.post('/response',aiLimiter,Auth,isUser,Calling)
route.post('/response/from-resume/:resumeId',aiLimiter,Auth,isUser,CallingFromSavedResume)

// authLimiter stops brute-force sir, otpLimiter stops email spam.
// validate() runs BEFORE the controller so a malformed request is rejected with a 400 and a
// { field, message } the form can highlight, and the controller only ever sees a known shape
// with unknown keys already stripped (see Middlewares/Validate.js).
route.post('/Createuser',authLimiter,validate({ body: createUserSchema }),createUser)
route.post('/Login',authLimiter,validate({ body: loginSchema }),loginUser)
// revokes the session server-side sir — bumps tokenVersion so the token dies everywhere,
// instead of the frontend merely forgetting it while it stays valid for another 7 days
route.post('/Logout',Auth,logoutUser)
route.post('/Send-otp',otpLimiter,validate({ body: sendOtpSchema }),SendOtp)

// full-page redirect flow sir, not XHR — authLimiter still applies so the callback can't be hammered
route.get('/auth/google',authLimiter,googleLogin)
route.get('/auth/google/callback',authLimiter,googleCallback)
// the frontend calls this right after landing on /oauth/complete sir — trades the one-time
// code (all the redirect URL ever carries) for the real token, in the response body only
route.post('/auth/google/exchange',authLimiter,exchangeGoogleCode)

route.get('/auth/github',authLimiter,githubLogin)
route.get('/auth/github/callback',authLimiter,githubCallback)
route.post('/auth/github/exchange',authLimiter,exchangeGitHubCode)

// authLimiter here too sir — stops the reset-email and reset-token endpoints being brute-forced
route.post('/forgot-password',authLimiter,validate({ body: forgotPasswordSchema }),forgotPassword)
// the reset path now enforces the SAME password policy as signup sir — it previously had none,
// so a reset could set a weaker password than registration would ever have accepted
route.post('/reset-password',authLimiter,validate({ body: resetPasswordSchema }),resetPassword)
route.put('/change-password',Auth,validate({ body: changePasswordSchema }),updatePassword)
route.delete('/delete-account',Auth,deleteAccount)

// the account page reads everything from here sir
route.get('/profile',Auth,getProfile)
route.patch('/profile/notifications',Auth,validate({ body: notificationPrefsSchema }),updateNotificationPrefs)
route.patch('/profile/onboarding',Auth,completeOnboarding)
route.patch('/profile/first-name',Auth,validate({ body: updateFirstNameSchema }),updateFirstName)
route.patch('/profile/last-name',Auth,validate({ body: updateLastNameSchema }),updateLastName)
route.patch('/profile/email',Auth,validate({ body: updateEmailSchema }),updateEmail)
route.patch('/profile/number',Auth,validate({ body: updateNumberSchema }),updateNumber)

// self-signup for Recruiter access sir — isUser blocks Admin/Support/existing-Recruiter
// accounts from "applying" for a role they already have or aren't eligible for
route.post('/recruiter-applications',Auth,isUser,validate({ body: recruiterApplicationSchema }),applyForRecruiter)

// the one route a banned account can still reach sir — Auth.js explicitly exempts this exact
// path from its ban block (see BAN_CHECK_EXEMPT_PATHS), everything else stays fully locked
route.post('/appeal-suspension',Auth,authLimiter,validate({ body: appealSuspensionSchema }),submitSuspensionAppeal)

// GDPR-style self-service data dump sir, separate from delete-account
route.get('/profile/export',Auth,exportMyData)

module.exports = route
