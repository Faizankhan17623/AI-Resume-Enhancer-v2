const mongoose = require('mongoose')

const UserCreation = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        confirmpassword:{
            type: String,
            required: true
        },
        token: {
            type: String,
        },
        resetPasswordToken: {
            type: String,
        },
        resetPasswordExpires: {
            type: Date,
        },
        count:{
            type:Number,
            default:0
        },
        number:{
            type: String,
            required: true
        },
        CountryCode:{
            type: String,
            required: true
        },
        Verified:{
            type:Boolean,
            default:false,
            required:true
        },
        id: {
            type: String,
            default: 0,
        },
        Buffer:{
            type:Boolean,
            default:false
        },
        BufferTiming:{
            type:String
        },
        Newchat:[{
            type:mongoose.Schema.ObjectId,
            ref:"Chat"
        }],
        // RBAC sir — User is normal, Support can view/help but not destroy, Admin can do everything
        role:{
            type:String,
            enum:['User','Support','Admin'],
            default:'User'
        },
        // moderation sir — a banned user is blocked by the Auth middleware everywhere, instantly
        isBanned:{
            type:Boolean,
            default:false
        },
        banReason:{
            type:String,
            trim:true
        },
        Subscription:{
            type:Boolean,
            default:false
        },
        // every user starts on the free Basic plan sir
        SubType:{
            type:String,
            enum:['Basic','Pro','ProMax'],
            default:'Basic'
        },
        // when the paid plan runs out sir — past this date the user is Basic again
        SubscriptionExpires:{
            type:Date
        },
        // consecutive-day activity streak sir — bumped by any review or chat message
        currentStreak: {
            type: Number,
            default: 0
        },
        longestStreak: {
            type: Number,
            default: 0
        },
        lastActivityDate: {
            type: Date
        },
        // per-type opt-out sir — all on by default, the account page lets a user flip these off individually
        notifyStreak: {
            type: Boolean,
            default: true
        },
        notifyWinBack: {
            type: Boolean,
            default: true
        },
        notifyDigest: {
            type: Boolean,
            default: true
        },
        // brute-force lockout sir — on top of the IP rate limiter, this is PER-ACCOUNT so a
        // distributed attack (many IPs, one target account) still gets stopped
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        // set only while locked sir — null/past means the account can log in again
        lockUntil: {
            type: Date
        }
    }, { timestamps: true }
)


module.exports = mongoose.model("User", UserCreation)