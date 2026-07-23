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
        // required only for a normal email/password signup sir — an OAuth account
        // (see `provider` below) never sets these, there's nothing to compare against
        password: {
            type: String,
            required: function () { return this.provider === 'local' }
        },
        confirmpassword:{
            type: String,
            required: function () { return this.provider === 'local' }
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
        // required only for a normal signup sir — Google never gives us a phone number,
        // and there's no equivalent to ask for mid-OAuth-redirect without extra friction
        number:{
            type: String,
            required: function () { return this.provider === 'local' },
            match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits']
        },
        CountryCode:{
            type: String,
            required: function () { return this.provider === 'local' }
        },
        // which identity system owns this account sir — 'local' is the existing email+password
        // flow, everything else is an OAuth provider. Drives which fields are required above.
        provider: {
            type: String,
            enum: ['local', 'google', 'facebook', 'github', 'linkedin'],
            default: 'local',
        },
        // the provider's own stable user id (Google's `sub` claim) sir — never the email,
        // since an email can be reused/changed on the provider side but this id can't
        providerId: {
            type: String,
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
        // monthly re-surface of the default resume's stored ATS formatting score sir —
        // same opt-out pattern as the three above
        notifyHealthCheck: {
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
        },
        // dashboard onboarding checklist sir — true once dismissed or every step is done,
        // false forever after that so the checklist never reappears
        onboardingCompleted: {
            type: Boolean,
            default: false
        },
        // bumped on every completed feature use (review, chat, cover letter, job search) sir —
        // drives when the feedback popup is due, independent of the daily activity streak above
        featureUseCount: {
            type: Number,
            default: 0
        },
        // true once the user has submitted the feedback popup (star rating + referral score) sir —
        // the popup stops nagging them for good after this flips
        feedbackSubmitted: {
            type: Boolean,
            default: false
        }
    }, { timestamps: true }
)


module.exports = mongoose.model("User", UserCreation)