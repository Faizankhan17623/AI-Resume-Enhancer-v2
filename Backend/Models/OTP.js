const otpGenerator = require('otp-generator')
const mongoose = require('mongoose')

const OTPSchema = new mongoose.Schema({
    otp:{
        type:String,
        required:true,
        maxlength:6
    },
    email:{
        type:String,
        required:true
    },
    createdAt: {
		type: Date,
		default: Date.now,
		// 1 minute sir, per direct request (was 2). MUST match ResumeEnhancer/src/Components/
		// UserCreation/OTP.jsx's OTP_LIFETIME_SECONDS — that frontend countdown is purely
		// cosmetic, this TTL index is the actual expiry a verify attempt is checked against.
		expires: 60,
	},
},{timestamps:true})

// no pre('save') mail hook here anymore sir — sending the OTP email used to block this
// document's save() on the Vercel relay call (itself with a 20s timeout, see Nodemailer.js).
// A slow/down relay meant save() itself hung then rejected, so the OTP was never persisted
// and signup failed on any relay hiccup. The email send now happens in the controller
// (user.js SendOtp) AFTER OTP.create() succeeds, as its own try/catch step, so a relay
// failure can't take down OTP creation.

module.exports = mongoose.model("OTP",OTPSchema)