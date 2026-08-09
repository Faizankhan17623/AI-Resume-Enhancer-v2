const mongoose = require('mongoose')
const logger = require('../utils/logger')
const jwt = require('jsonwebtoken')

const User = require('../Models/User')
const Chat = require('../Models/Chat')
const Review = require('../Models/Review')
const Payment = require('../Models/Payment')
const { PLANS, getEffectivePlan } = require('../utils/Plans')
const { logAction } = require('../utils/AdminLog')
const mailSender = require('../utils/Nodemailer.js')
const { supportPromotionTemplate } = require('../Templates/supportPromotionTemplate.js')

// everything the admin dashboard needs lives here sir — every route is behind Auth + isAdmin

// shared by the single and bulk role-change endpoints sir — best-effort, never fails the
// actual role change if mail hiccups
const sendSupportPromotionEmailIfNeeded = async (user, oldRole, newRole) => {
    if (oldRole !== 'User' || newRole !== 'Support') return
    try {
        await mailSender(
            user.email,
            "You've Been Promoted to Support",
            supportPromotionTemplate(`${user.firstName} ${user.lastName}`)
        )
    } catch (mailError) {
        // bare logger sir — this is a shared helper, called with a user, not a request
        logger.error('Failed to send support-promotion email', { err: mailError })
    }
}

// GET /admin/stats — the headline numbers + the last-30-days graphs in ONE call sir
exports.getDashboardStats = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const now = new Date()

        // run all the independent counts in parallel sir — one slow query shouldn't stack on another
        const [
            totalUsers,
            verifiedUsers,
            proUsers,
            proMaxUsers,
            totalReviews,
            totalChats,
            avgScoreAgg,
            revenueAgg,
            signupsPerDay,
            reviewsPerDay,
            revenuePerDay,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ Verified: true }),
            // only ACTIVE paid subs count sir — expired ones are Basic again
            User.countDocuments({ Subscription: true, SubType: 'Pro', SubscriptionExpires: { $gt: now } }),
            User.countDocuments({ Subscription: true, SubType: 'ProMax', SubscriptionExpires: { $gt: now } }),
            Review.countDocuments(),
            Chat.countDocuments(),
            Review.aggregate([
                { $group: { _id: null, avgScore: { $avg: '$atsScore' } } }
            ]),
            Payment.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            // the three 30-day time series for the dashboard graphs sir
            User.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Review.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, avgScore: { $avg: '$atsScore' } } },
                { $sort: { _id: 1 } }
            ]),
            Payment.aggregate([
                { $match: { status: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amountPaise: { $sum: '$amount' }, count: { $sum: 1 } } },
                // rupees, not paise sir — matches the headline "Revenue" stat card above
                { $addFields: { amount: { $round: [{ $divide: ['$amountPaise', 100] }, 0] } } },
                { $project: { amountPaise: 0 } },
                { $sort: { _id: 1 } }
            ]),
        ])

        return res.status(200).json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    verified: verifiedUsers,
                    // plan split sir — Basic is everyone without an active paid sub
                    plans: {
                        Basic: totalUsers - proUsers - proMaxUsers,
                        Pro: proUsers,
                        ProMax: proMaxUsers,
                    },
                    // conversion % straight for the dashboard card sir
                    paidConversion: totalUsers ? Number((((proUsers + proMaxUsers) / totalUsers) * 100).toFixed(1)) : 0,
                },
                usage: {
                    totalReviews,
                    totalChats,
                    avgAtsScore: avgScoreAgg[0] ? Math.round(avgScoreAgg[0].avgScore) : 0,
                },
                revenue: {
                    // amounts are in paise sir, same as Razorpay stores them
                    totalPaise: revenueAgg[0]?.total || 0,
                    totalRupees: Math.round((revenueAgg[0]?.total || 0) / 100),
                    paidOrders: revenueAgg[0]?.count || 0,
                },
            },
            charts: {
                signupsPerDay,
                reviewsPerDay,
                revenuePerDay,
            }
        })
    } catch (error) {
        (req.log || logger).error('get dashboard stats failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the dashboard stats',
        })
    }
}

// GET /admin/users?page=1&limit=20&search=foo&role=User — paginated user list with search sir
// Admins are always excluded from this list — it's a user/support management view, not an admin directory.
exports.getUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
        const search = (req.query.search || '').trim()
        const role = (req.query.role || '').trim()

        // Admins never show up here regardless of filter; role param can narrow to 'User' or 'Support' only.
        const filter = ['User', 'Support'].includes(role) ? { role } : { role: { $ne: 'Admin' } }
        if (search) {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            filter.$or = [
                { email: { $regex: safe, $options: 'i' } },
                { firstName: { $regex: safe, $options: 'i' } },
                { lastName: { $regex: safe, $options: 'i' } },
            ]
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('firstName lastName email role isBanned banReason Verified Subscription SubType SubscriptionExpires count createdAt provider')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            User.countDocuments(filter),
        ])

        return res.status(200).json({
            success: true,
            // effectivePlan, not the raw SubType sir — an expired Pro keeps SubType:'Pro' stored
            // until the reconcile job demotes them (utils/SubscriptionReconcileCron.js), so the
            // raw column showed support/admin staff a lapsed user as an active paying customer.
            // Both are returned: effectivePlan is what they HAVE, SubType is what's on record.
            users: users.map((u) => ({
                ...u.toObject(),
                effectivePlan: getEffectivePlan(u).key,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            }
        })
    } catch (error) {
        (req.log || logger).error('get users failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the users',
        })
    }
}

// GET /admin/users/:userId — one user with their activity summary sir
exports.getUserDetail = async (req, res) => {
    try {
        const { userId } = req.params

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        const user = await User.findById(userId)
            .select('-password -token -resetPasswordToken -resetPasswordExpires')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // their activity in parallel sir
        const [reviewCount, chatCount, reviews, payments] = await Promise.all([
            Review.countDocuments({ user: userId }),
            Chat.countDocuments({ user: userId }),
            Review.find({ user: userId }).select('jdTitle atsScore verdict plan createdAt').sort({ createdAt: -1 }).limit(10),
            Payment.find({ user: userId }).select('plan amount status orderId createdAt').sort({ createdAt: -1 }).limit(10),
        ])

        return res.status(200).json({
            success: true,
            user,
            activity: {
                reviewCount,
                chatCount,
                recentReviews: reviews,
                recentPayments: payments,
            }
        })
    } catch (error) {
        (req.log || logger).error('get user detail failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the user',
        })
    }
}

// PATCH /admin/users/:userId/role — promote/demote sir, body: { role: 'User' | 'Support' }
// Admin is deliberately NOT settable here — granting/removing Admin access is a manual,
// out-of-band operation, never something reachable from this UI.
exports.updateUserRole = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userId } = req.params
        const { role } = req.body

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        if (!['User', 'Support'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be 'User' or 'Support'",
            })
        }

        // an admin cannot demote themselves sir — otherwise the last admin can lock everyone out
        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own admin access',
            })
        }

        // read the old role first sir so the audit log records from → to
        const user = await User.findById(userId).select('firstName lastName email role')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // this endpoint can only move someone between User and Support sir — an existing
        // Admin's role is off-limits here entirely, same reasoning as the self-demote guard above
        if (user.role === 'Admin') {
            return res.status(400).json({
                success: false,
                message: 'Admin roles cannot be changed from this page',
            })
        }

        const oldRole = user.role
        user.role = role
        await user.save()

        logAction(adminId, 'ROLE_CHANGE', user, { from: oldRole, to: role })
        await sendSupportPromotionEmailIfNeeded(user, oldRole, role)

        return res.status(200).json({
            success: true,
            message: `${user.email} is now ${role === 'Support' ? 'a Support member' : 'a normal User'}`,
            user
        })
    } catch (error) {
        (req.log || logger).error('update user role failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the role',
        })
    }
}

// PATCH /admin/users/bulk-role — move several accounts between User and Support at once sir,
// body: { userIds: [...], role: 'User' | 'Support' }. Same rules as the single-user version:
// can't touch yourself, can't touch an existing Admin — those ids are skipped, not a hard failure.
exports.bulkUpdateUserRole = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userIds, role } = req.body

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be a non-empty array',
            })
        }

        if (userIds.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Cannot act on more than 200 users at once',
            })
        }

        if (!['User', 'Support'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be 'User' or 'Support'",
            })
        }

        const validIds = userIds.filter((id) => mongoose.isValidObjectId(id) && id !== adminId)
        const users = await User.find({ _id: { $in: validIds } }).select('firstName lastName email role')

        const updated = []
        const skipped = []

        for (const user of users) {
            if (user.role === 'Admin') {
                skipped.push(user.email)
                continue
            }
            const oldRole = user.role
            user.role = role
            await user.save()
            logAction(adminId, 'ROLE_CHANGE', user, { from: oldRole, to: role, bulk: true })
            await sendSupportPromotionEmailIfNeeded(user, oldRole, role)
            updated.push(user.email)
        }

        return res.status(200).json({
            success: true,
            message: `${updated.length} account${updated.length === 1 ? '' : 's'} moved to ${role}${skipped.length ? `, ${skipped.length} skipped (admins can't be changed here)` : ''}`,
            updated,
            skipped,
        })
    } catch (error) {
        (req.log || logger).error('bulk update user role failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the roles',
        })
    }
}

// PATCH /admin/users/:userId/plan — gift/fix a plan by hand sir, body: { plan: 'Basic' | 'Pro' | 'ProMax' }
// useful for support cases: refunds, failed webhooks, giveaways. Admin-only, and deliberately
// a confirm-dialog action in the UI rather than a casual dropdown, since it's revenue-adjacent.
exports.updateUserPlan = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userId } = req.params
        const { plan } = req.body

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        if (!PLANS[plan]) {
            return res.status(400).json({
                success: false,
                message: "Plan must be 'Basic', 'Pro' or 'ProMax'",
            })
        }

        // Basic means clearing the subscription sir; paid plans get the full validity window + a fresh credit count
        const update = plan === 'Basic'
            ? { Subscription: false, SubType: 'Basic', SubscriptionExpires: null }
            : {
                Subscription: true,
                SubType: plan,
                SubscriptionExpires: new Date(Date.now() + PLANS[plan].validityDays * 24 * 60 * 60 * 1000),
                count: 0,
            }

        const user = await User.findByIdAndUpdate(userId, update, { new: true })
            .select('firstName lastName email SubType Subscription SubscriptionExpires count')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        logAction(adminId, 'PLAN_CHANGE', user, { to: plan })

        return res.status(200).json({
            success: true,
            message: `${user.email} is now on the ${PLANS[plan].name} plan`,
            user
        })
    } catch (error) {
        (req.log || logger).error('update user plan failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the plan',
        })
    }
}

// DELETE /admin/users/:userId — remove a user and ALL their data sir
exports.deleteUser = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userId } = req.params

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        // an admin deleting themselves from the dashboard is always a mistake sir
        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account from the admin dashboard',
            })
        }

        const user = await User.findByIdAndDelete(userId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // clean up everything they owned sir — payments stay as the financial record
        await Promise.all([
            Chat.deleteMany({ user: userId }),
            Review.deleteMany({ user: userId }),
        ])

        logAction(adminId, 'USER_DELETE', user, {})

        return res.status(200).json({
            success: true,
            message: `${user.email} and all their chats/reviews were deleted`,
        })
    } catch (error) {
        (req.log || logger).error('delete user failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the user',
        })
    }
}

// PATCH /admin/users/bulk-ban — suspend or restore several accounts at once sir,
// body: { userIds: [...], banned: true/false, reason }. Same rules as the single-user ban:
// can't touch yourself, can't ban an Admin — those ids are just skipped, not a hard failure,
// so one bad row doesn't block the rest of a legitimate batch.
exports.bulkBanUsers = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userIds, banned, reason } = req.body

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be a non-empty array',
            })
        }

        if (userIds.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Cannot act on more than 200 users at once',
            })
        }

        if (typeof banned !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "'banned' must be true or false",
            })
        }

        const validIds = userIds.filter((id) => mongoose.isValidObjectId(id) && id !== adminId)
        const users = await User.find({ _id: { $in: validIds } }).select('firstName lastName email role isBanned banReason')

        const updated = []
        const skipped = []
        const trimmedReason = banned ? (reason || '').trim() : undefined

        for (const user of users) {
            if (banned && user.role === 'Admin') {
                skipped.push(user.email)
                continue
            }
            user.isBanned = banned
            user.banReason = trimmedReason
            await user.save()
            logAction(adminId, banned ? 'USER_BAN' : 'USER_UNBAN', user, { reason: trimmedReason, bulk: true })
            updated.push(user.email)
        }

        return res.status(200).json({
            success: true,
            message: `${updated.length} account${updated.length === 1 ? '' : 's'} ${banned ? 'suspended' : 'restored'}${skipped.length ? `, ${skipped.length} skipped (admins can't be banned)` : ''}`,
            updated,
            skipped,
        })
    } catch (error) {
        (req.log || logger).error('bulk ban users failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the accounts',
        })
    }
}

// PATCH /admin/users/:userId/ban — suspend or restore an account sir, body: { banned: true/false, reason }
exports.banUser = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userId } = req.params
        const { banned, reason } = req.body

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        if (typeof banned !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "'banned' must be true or false",
            })
        }

        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot ban yourself',
            })
        }

        const user = await User.findById(userId).select('firstName lastName email role isBanned banReason')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // admins cannot be banned sir — demote them to User first, on purpose, then ban
        if (banned && user.role === 'Admin') {
            return res.status(400).json({
                success: false,
                message: 'Administrators cannot be banned — demote them first',
            })
        }

        user.isBanned = banned
        user.banReason = banned ? (reason || '').trim() : undefined
        await user.save()

        logAction(adminId, banned ? 'USER_BAN' : 'USER_UNBAN', user, { reason: user.banReason })

        return res.status(200).json({
            success: true,
            message: banned
                ? `${user.email} has been suspended`
                : `${user.email} has been restored`,
            user
        })
    } catch (error) {
        (req.log || logger).error('ban user failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the ban status',
        })
    }
}

// PATCH /admin/users/:userId/credits — support tool sir, body: { delta }
// delta is applied to the USED count: { delta: -1 } refunds one credit, { delta: 2 } charges two
exports.adjustCredits = async (req, res) => {
    try {
        const actorId = req?.User.id
        const { userId } = req.params
        const delta = Number(req.body.delta)

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        if (!Number.isInteger(delta) || delta === 0) {
            return res.status(400).json({
                success: false,
                message: "'delta' must be a non-zero integer (negative refunds credits)",
            })
        }

        const user = await User.findById(userId).select('firstName lastName email count')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // count can never go below zero sir
        const oldCount = user.count
        user.count = Math.max(0, oldCount + delta)
        await user.save()

        logAction(actorId, 'CREDIT_ADJUST', user, { delta, from: oldCount, to: user.count })

        return res.status(200).json({
            success: true,
            message: `${user.email}: used credits went ${oldCount} → ${user.count}`,
            user
        })
    } catch (error) {
        (req.log || logger).error('adjust credits failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while adjusting the credits',
        })
    }
}

// POST /admin/users/:userId/impersonate — a 15-minute token to see the app as this user sir
// for debugging support tickets; every use is audit-logged with who did it
exports.impersonateUser = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { userId } = req.params

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        const user = await User.findById(userId).select('firstName lastName email role tokenVersion')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // same payload shape as the login token sir (see utils/session.js's signSessionToken),
        // plus the impersonatedBy marker — expires in 15 minutes.
        //
        // tv (tokenVersion) MUST be included sir — Auth.js rejects any token whose tv doesn't
        // match the live user record, and defaults a missing tv to 0. Omitting it here meant
        // impersonation instantly failed with "Your session has ended" for any user who had
        // EVER logged out, changed their password, or been through account recovery (all of
        // which bump tokenVersion past 0) — i.e. almost anyone a support ticket would be about.
        const token = jwt.sign(
            {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                tv: user.tokenVersion || 0,
                impersonatedBy: adminId,
            },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: '15m' }
        )

        logAction(adminId, 'IMPERSONATE', user, { expiresIn: '15m' })

        return res.status(200).json({
            success: true,
            message: `Impersonation token for ${user.email}, valid for 15 minutes`,
            token
        })
    } catch (error) {
        (req.log || logger).error('impersonate user failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the impersonation token',
        })
    }
}

// ---------- INSPECTOR sir — read-only look into a user's content for abuse reports ----------

// GET /admin/users/:userId/reviews — a user's review history sir (light fields)
exports.getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        const reviews = await Review.find({ user: userId })
            .select('jdTitle atsScore verdict plan createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            reviews
        })
    } catch (error) {
        (req.log || logger).error('get user reviews failed', { err: error })
        return res.status(500).json({
            success: false,
            message: "Something went wrong while getting the user's reviews",
        })
    }
}

// GET /admin/users/:userId/chats — a user's chat list sir
exports.getUserChats = async (req, res) => {
    try {
        const { userId } = req.params

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
            })
        }

        const chats = await Chat.find({ user: userId })
            .select('title createdAt updatedAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            chats
        })
    } catch (error) {
        (req.log || logger).error('get user chats failed', { err: error })
        return res.status(500).json({
            success: false,
            message: "Something went wrong while getting the user's chats",
        })
    }
}

// GET /admin/chats/:chatId — one full chat with messages sir, no user filter because this IS the admin view
exports.getChatDetail = async (req, res) => {
    try {
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        const chat = await Chat.findById(chatId)
            .select('user title jd messages createdAt updatedAt')
            .populate('user', 'firstName lastName email')

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        return res.status(200).json({
            success: true,
            chat
        })
    } catch (error) {
        (req.log || logger).error('get chat detail failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the chat',
        })
    }
}
