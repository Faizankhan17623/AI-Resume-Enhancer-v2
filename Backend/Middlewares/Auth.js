
const jwt = require('jsonwebtoken')
const User = require('../Models/User')
const logger = require('../utils/logger')

// the ONE way a request presents its session sir — the httpOnly cookie first, then the
// Authorization header for clients that can't rely on cross-site cookies.
//
// req.body.token was deliberately REMOVED as a source: accepting credentials from a JSON body
// makes the token land in request logs and in any handler that echoes its own body back, and it
// widens CSRF exposure because a form post can carry a body but not a custom header. Nothing in
// the frontend ever sent it that way.
const extractToken = (req) =>
    req.cookies?.token ||
    req.header('Authorization')?.replace('Bearer ', '')

module.exports.extractToken = extractToken

exports.Auth = async (req, res, next) => {
    try {
        const token = extractToken(req)

        // not case sir — no token was sent
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token is missing, please log in',
            })
        }

        // verify the token sir
        const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY)

        // not case sir — token did not decode to anything usable
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token, please log in again',
            })
        }

        // load the live account state sir — role and ban status must be FRESH from the DB,
        // never trusted from a token that could be days old
        const user = await User.findById(decoded.id).select('role isBanned banReason Buffer tokenVersion')

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Account not found, please log in again',
            })
        }

        // revocation check sir — a JWT can't be un-issued, so every token carries the
        // tokenVersion it was minted with and we compare it against the live one. Logout, a
        // password change and account deletion all bump the counter, which instantly kills every
        // token issued before that point (including one an attacker already stole).
        if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
            return res.status(401).json({
                success: false,
                message: 'Your session has ended, please log in again',
            })
        }

        // banned users are blocked everywhere, instantly sir
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: user.banReason
                    ? `Your account has been suspended: ${user.banReason}`
                    : 'Your account has been suspended, please contact support',
            })
        }

        // scheduled-for-deletion users are blocked everywhere too sir — logging back in
        // (loginUser, which never passes through this middleware) is what un-suspends them,
        // same shape as the ban check above
        if (user.Buffer) {
            return res.status(403).json({
                success: false,
                message: 'This account is scheduled for deletion. Log back in to recover it.',
            })
        }

        // attach the decoded payload + the fresh role so the next handlers can use req.User sir
        req.User = decoded
        req.User.role = user.role

        // hand off to the next middleware / controller sir
        next()
    } catch (error) {
        // expected for an expired/tampered token sir — debug, not error, so real problems stand out
        logger.debug('authentication failed', { err: error })
        return res.status(401).json({
            success: false,
            message: 'Failed to authenticate',
        })
    }
}

// admin gate sir — runs AFTER Auth, which already loaded the role fresh from the DB
// so a demoted admin loses access instantly, no extra query needed here
exports.isAdmin = (req, res, next) => {
    if (req?.User?.role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'This route is for administrators only',
        })
    }
    next()
}

// support gate sir — Support AND Admin both pass, for the view/help routes
// (Support can look and assist, only Admin can promote, ban or delete)
exports.isSupport = (req, res, next) => {
    if (!['Support', 'Admin'].includes(req?.User?.role)) {
        return res.status(403).json({
            success: false,
            message: 'This route is for the support team and administrators only',
        })
    }
    next()
}

// product-feature gate sir — the mirror of isAdmin/isSupport, for the OTHER direction.
// Every role is strictly isolated to its own dashboard (frontend: PrivateRoute/AdminRoute/
// SupportRoute); this is the server-side enforcement so an Admin/Support token can't just
// call the User-facing product APIs (AI review, chat, resume builder, etc) directly,
// bypassing the frontend guard entirely. Account-management routes (profile, password,
// delete-account, notifications) are NOT behind this — every role still manages its own account.
exports.isUser = (req, res, next) => {
    if (req?.User?.role !== 'User') {
        return res.status(403).json({
            success: false,
            message: 'Admin and Support accounts cannot use this feature — sign in with a normal user account instead',
        })
    }
    next()
}
