const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const User = require('../Models/User')
const Chat = require('../Models/Chat')
const Review = require('../Models/Review')
const Payment = require('../Models/Payment')
const { PLANS } = require('../utils/Plans')
const { logAction } = require('../utils/AdminLog')

// everything the admin dashboard needs lives here sir — every route is behind Auth + isAdmin

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
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the dashboard stats',
        })
    }
}

// GET /admin/users?page=1&limit=20&search=foo — paginated user list with search sir
exports.getUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
        const search = (req.query.search || '').trim()

        // search matches name or email sir — escaped so regex chars in the input can't break the query
        const filter = {}
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
                .select('firstName lastName email role isBanned Verified Subscription SubType SubscriptionExpires count createdAt')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            User.countDocuments(filter),
        ])

        return res.status(200).json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            }
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
            .select('-password -confirmpassword -token -resetPasswordToken -resetPasswordExpires')

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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the user',
        })
    }
}

// PATCH /admin/users/:userId/role — promote/demote sir, body: { role: 'Admin' | 'User' }
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

        if (!['User', 'Support', 'Admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be 'User', 'Support' or 'Admin'",
            })
        }

        // an admin cannot demote themselves sir — otherwise the last admin can lock everyone out
        if (userId === adminId && role !== 'Admin') {
            return res.status(400).json({
                success: false,
                message: 'You cannot remove your own admin access',
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

        const oldRole = user.role
        user.role = role
        await user.save()

        logAction(adminId, 'ROLE_CHANGE', user, { from: oldRole, to: role })

        return res.status(200).json({
            success: true,
            message: `${user.email} is now ${role === 'Admin' ? 'an Administrator' : role === 'Support' ? 'a Support member' : 'a normal User'}`,
            user
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the role',
        })
    }
}

// PATCH /admin/users/:userId/plan — gift/fix a plan by hand sir, body: { plan: 'Basic' | 'Pro' | 'ProMax' }
// useful for support cases: refunds, failed webhooks, giveaways
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the user',
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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

        const user = await User.findById(userId).select('firstName lastName email role')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // same payload shape as the login token sir, plus the impersonatedBy marker — expires in 15 minutes
        const token = jwt.sign(
            {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the chat',
        })
    }
}
