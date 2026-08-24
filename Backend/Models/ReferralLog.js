const mongoose = require('mongoose')

// one row per successful referral sir — created in controllers/user.js's grantReferralBonus,
// right alongside the credit adjustment itself. Backs the Account page's referral dashboard
// (list of who was invited + when + how much) and its date-range totals (week/month/year/custom).
//
// referredUserName/referredUserEmail are DENORMALIZED snapshots sir, not populated live — two
// reasons: (1) the dashboard's list view never needs a join/populate per row, just a plain find +
// sort, and (2) the referred user deleting their own account later (Admin.js's deleteUser, or
// self-service) must not turn the referrer's own history into "Deleted User" rows — the referrer
// earned that credit and keeps the record of who it was for, independent of that other account's
// lifecycle.
const referralLogSchema = new mongoose.Schema(
    {
        referrer: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        referredUser: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        referredUserName: {
            type: String,
            trim: true,
        },
        referredUserEmail: {
            type: String,
            trim: true,
        },
        // 0 for a Recruiter referrer/referee sir — the card is visible to Recruiters (they can
        // still see who they invited) but the bonus-credit mechanic is User-only, since Recruiters
        // don't spend AI review credits. This still gets a row so the dashboard's invite LIST is
        // accurate for everyone, just with bonusCredits: 0 for that entry.
        bonusCredits: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
)

// the dashboard's default view sorts by newest sir, and every date-range total query
// (week/month/year/custom) filters createdAt for one referrer
referralLogSchema.index({ referrer: 1, createdAt: -1 })

module.exports = mongoose.model('ReferralLog', referralLogSchema)
