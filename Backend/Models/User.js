const mongoose = require('mongoose')

const UserCreation = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true,
            index: true
        },
        lastName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true,
            index: true
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
        // NOTE sir: there is deliberately no `confirmpassword` field here.
        // It used to be persisted as a SECOND bcrypt hash of the same password, written in ~30
        // places. That is a form-submission concern, not domain state: it doubled the cost of
        // every password write, and because the two hashes were computed independently they
        // could silently diverge — at which point nothing in the app would notice or care,
        // since only `password` was ever compared at login. Confirmation is now checked in the
        // request validation layer (Validation/schemas.js) where it belongs, and discarded.
        token: {
            type: String,
        },
        // session revocation counter sir. A JWT is self-contained: once signed it stays valid
        // for its full 7 days and NOTHING could previously invalidate it — a stolen token kept
        // working after a password reset, after a logout, and after an admin banned the account.
        // Every issued token carries the tv it was minted with; bumping this number instantly
        // invalidates every token issued before the bump (see Middlewares/Auth.js).
        // Bumped on: logout, password reset/change, and account deletion.
        tokenVersion: {
            type: Number,
            default: 0
        },
        resetPasswordToken: {
            type: String,
            index: true
        },
        resetPasswordExpires: {
            type: Date,
        },
        count:{
            type:Number,
            default:0
        },
        // Basic-tier credit reset sir — Basic has no SubscriptionExpires (validityDays: null), so
        // SubscriptionReconcileCron.js never touches it; a Basic user's 5 free credits used to be
        // a lifetime cap with no reset at all, unless they later bought a paid plan (which resets
        // `count` to 0 as a side effect of activatePaidOrder). Per direct request, Basic's credits
        // are meant to refresh monthly like everything else — this is the lazy-rolling-cycle start
        // timestamp for that, same pattern as recruiterCycleStart in RecruiterPlans.js. Only
        // consulted for Basic-tier accounts (see utils/Plans.js's resetCreditCycleIfNeeded) — a
        // paid plan's own SubscriptionExpires/reconcile-cron already covers the same job for Pro/ProMax.
        creditCycleStart: {
            type: Date,
        },
        // stacks ON TOP of the plan's normal credit allowance sir — admin grants (Admin.js's
        // adjustCredits/grantCreditsToAll) and referral rewards (controllers/user.js's
        // grantReferralBonus) both add here instead of decrementing `count`, so a bonus never
        // gets silently wasted once a user is already at/near their plan cap. consumeCredit in
        // utils/Plans.js draws from the plan allowance first, then this pool.
        bonusCredits:{
            type:Number,
            default:0
        },
        // how much of bonusCredits has been spent sir — lets refundCredit in utils/Plans.js tell
        // whether the credit it's refunding came out of the plan allowance or the bonus pool, so
        // it hands the refund back to the right bucket instead of always crediting `count`
        spentBonus:{
            type:Number,
            default:0
        },
        // required only for a normal signup sir — Google never gives us a phone number,
        // and there's no equivalent to ask for mid-OAuth-redirect without extra friction
        number:{
            type: String,
            required: function () { return this.provider === 'local' },
            match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'],
            index: true
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
        // RBAC sir — User is normal, Support can view/help but not destroy, Admin can do everything,
        // Recruiter owns proctored tests (see Models/Test.js, Models/TestAttempt.js) and is
        // otherwise isolated from both the admin tools and the candidate-facing product features
        role:{
            type:String,
            enum:['User','Support','Admin','Recruiter'],
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
        // Support-only sir — a distinct third state beyond plain isBanned. A regular suspended
        // Support account can still log in and submit their one appeal (Auth.js's ban-exempt
        // path); permanentlySuspended additionally blocks even THAT — no appeal, no exceptions,
        // set either directly via Admin.js's permanentlySuspendSupport (a standalone action, no
        // appeal required first) or as the outcome of rejectSupportAppeal. Still lets them log
        // in (isBanned alone doesn't block login itself, only every route after), but every page
        // shows only the permanent-suspension notice — see SupportRoute.jsx.
        permanentlySuspended: {
            type: Boolean,
            default: false,
        },
        permanentSuspensionReason: {
            type: String,
            trim: true,
        },
        // the banned user's own response to an Admin sir — the ONLY way a banned account can ever
        // reach an Admin, since every other route is blocked the instant isBanned is true (see
        // Auth.js's ban check and its one exemption, POST /appeal-suspension). Same shape as
        // recruiterApplication below: user-submitted message + status, admin-set review fields.
        // Cleared entirely on unban (Admin.js's banUser) so a stale appeal never lingers into a
        // future, unrelated suspension.
        suspensionAppeal: {
            message: { type: String, trim: true, maxlength: 2000 },
            status: { type: String, enum: ['pending', 'reviewed'] },
            submittedAt: { type: Date },
            reviewedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
            reviewedAt: { type: Date },
        },
        // Support-only sir — a Support account gets exactly ONE appeal per suspension, ever,
        // unlike every other role (User/Recruiter keep unlimited resubmission, per the existing
        // design: only "no more than one PENDING appeal at a time"). Set true the moment a
        // Support account submits its one appeal (controllers/user.js's submitSuspensionAppeal)
        // and checked there before allowing a second attempt. Cleared on unban, same as
        // suspensionAppeal itself (Admin.js's banUser) — a FUTURE suspension starts its own
        // fresh one-appeal allowance, this only guards against retrying the SAME suspension.
        supportAppealUsed: {
            type: Boolean,
            default: false,
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
        // which expiry-reminder milestones have already been emailed for the CURRENT
        // SubscriptionExpires sir — see utils/PlanExpiryReminderCron.js. Tracks '7'/'3'/'1'/'0'
        // (days-before, '0' = expired-today) so the hourly cron never double-sends a milestone,
        // and a fresh purchase (activatePaidOrder sets a new SubscriptionExpires) naturally
        // resets this to [] again since it's overwritten alongside SubscriptionExpires there.
        planExpiryRemindersSent: {
            type: [String],
            default: [],
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
        // interview-practice reminder sir — same opt-out pattern, see StreakCron.js's
        // sendInterviewPrepNudges: only fires for a user with an active streak who hasn't run
        // a mock interview in a while, so it reinforces the daily habit rather than being generic
        notifyInterviewPrep: {
            type: Boolean,
            default: true
        },
        // Recruiter-side notification sir — same opt-out pattern as the User-facing ones above,
        // just the one Recruiter-relevant email that exists so far: a candidate applying to one
        // of their jobs (see controllers/Job.js's applyToJob)
        notifyNewApplicant: {
            type: Boolean,
            default: true
        },
        // Recruiter plan sir — completely separate from the User Subscription/SubType/
        // SubscriptionExpires fields above. Deliberately its own name, its own enum, its own
        // expiry field: a Recruiter's paid plan must never be confused with (or accidentally
        // overwrite) a User's plan state, since one account only ever really "is" one role at a
        // time but the fields all live on the same User document. See utils/RecruiterPlans.js —
        // the ONLY place recruiterPlan/recruiterPlanExpiresAt are read/written, mirroring how
        // utils/Plans.js is the sole owner of Subscription/SubType.
        recruiterPlan: {
            type: String,
            enum: ['Basic', 'Pro', 'ProMax'],
            default: 'Basic'
        },
        recruiterPlanExpiresAt: {
            type: Date
        },
        // usage counters for the current monthly cycle sir — reset by RecruiterPlans.js's
        // resetRecruiterCycleIfNeeded, a lazy rolling reset (checked/applied on read, no cron
        // needed), same idea as the credit-cycle pattern already used elsewhere in this app
        recruiterCycleStart: {
            type: Date
        },
        recruiterJobPostingsUsed: {
            type: Number,
            default: 0
        },
        recruiterAiScoresUsed: {
            type: Number,
            default: 0
        },
        recruiterJdWritesUsed: {
            type: Number,
            default: 0
        },
        recruiterInterviewQGenUsed: {
            type: Number,
            default: 0
        },
        recruiterSummariesUsed: {
            type: Number,
            default: 0
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
        },
        // self-signup request to become a Recruiter sir — role stays 'User' until an Admin
        // approves it (see controllers/Admin.js's approveRecruiterApplication). Approval is
        // what actually flips `role` to 'Recruiter', reusing the exact same mechanism as a
        // manual role-change from the Admin dashboard, just triggered by this instead.
        // referral program sir — every user gets a stable personal code, generated once at
        // creation (see the pre-save hook below). referredBy is set only at signup, from the
        // ?ref= code carried through createUser (see controllers/user.js), and never changes
        // after that — it's a record of who brought this person in, not a live relationship.
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        // public Career Copilot profile token; never expose private account fields through it
        careerShareId: { type: String, unique: true, sparse: true, index: true },
        referredBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        // true once the referral bonus has actually been paid out to BOTH sides sir — guards
        // against paying twice if loginUser's Verified-flip logic is ever hit more than once for
        // the same account (see controllers/user.js's loginUser)
        referralBonusGranted: {
            type: Boolean,
            default: false,
        },
        // how many successful (bonus-granted) referrals this user has made sir — capped in the
        // controller, this field is just the running count the cap checks against
        referralCount: {
            type: Number,
            default: 0,
        },
        recruiterApplication: {
            companyName: { type: String, trim: true, maxlength: 150 },
            companyWebsite: { type: String, trim: true, maxlength: 300 },
            // total headcount sir, a coarse bucket rather than an exact number — good enough
            // for the Admin's manual company-legitimacy judgment call, no need for precision
            companySize: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] },
            location: { type: String, trim: true, maxlength: 150 },
            // what they're hiring for sir — was "pitch", renamed to match what it actually asks
            hiringNeeds: { type: String, trim: true, maxlength: 2000 },
            status: { type: String, enum: ['pending', 'approved', 'rejected'] },
            reviewedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
            reviewedAt: { type: Date },
            rejectionReason: { type: String, trim: true, maxlength: 500 },
        }
    }, { timestamps: true }
)

// mints a stable referral code once, at creation, sir — never on every save. crypto is required
// lazily here since this is the only place in the model that needs it.
//
// no `next` callback parameter sir — this app's Mongoose version (9.x) does not inject one for a
// synchronous pre-save hook; declaring the old `function(next){...next()}` shape leaves `next`
// undefined and throws "next is not a function" on every single save (found live: this broke
// getReferralStats's backfill save with a 500 for any pre-existing account). A synchronous hook
// just returns/falls through — no callback needed.
UserCreation.pre('save', function () {
    if (this.isNew && !this.referralCode) {
        this.referralCode = require('crypto').randomBytes(4).toString('hex')
    }
})

module.exports = mongoose.model("User", UserCreation)
