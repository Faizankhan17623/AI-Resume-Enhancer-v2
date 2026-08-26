
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

// the ONE route a banned user must still be able to reach sir — submitting an appeal is the
// only way they can ever get un-banned, so it's the one exception to "banned users are blocked
// everywhere, instantly" below. Same exemption-list shape as apiConnector.js's
// SESSION_CHECK_EXEMPT_PATHS on the frontend.
const BAN_CHECK_EXEMPT_PATHS = ['/appeal-suspension']
const isBanCheckExempt = (req) => BAN_CHECK_EXEMPT_PATHS.some((path) => req.path?.includes(path))

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
        // never trusted from a token that could be days old. recruiterApplication.status is
        // what isApprovedRecruiter (below) checks, loaded here so that gate needs no extra query.
        const user = await User.findById(decoded.id).select('role isBanned banReason permanentlySuspended permanentSuspensionReason suspensionAppeal Buffer tokenVersion recruiterApplication')

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

        // banned users are blocked everywhere, instantly sir — except the one exempt path above,
        // which is how they get to actually appeal the ban in the first place.
        // permanentlySuspended (Support-only) additionally blocks even that exempt path — there
        // is no appeal left to submit once an Admin has permanently suspended the account, either
        // directly (Admin.js's permanentlySuspendSupport) or as the outcome of rejecting their
        // one appeal, so the exemption itself does not apply here.
        if (user.isBanned && !(isBanCheckExempt(req) && !user.permanentlySuspended)) {
            return res.status(403).json({
                success: false,
                banned: true,
                permanent: user.permanentlySuspended || undefined,
                message: user.permanentlySuspended
                    ? `Your account has been permanently suspended: ${user.permanentSuspensionReason || user.banReason || 'no reason recorded'}`
                    : user.banReason
                        ? `Your account has been suspended: ${user.banReason}`
                        : 'Your account has been suspended, please contact support',
                // discrete fields sir, mirroring publicUser()'s shape — so a tab that gets banned
                // MID-SESSION (apiConnector.js's ban interceptor) can merge these straight into
                // the cached user on its way to the Suspended page, instead of showing a blank
                // "no reason was provided" until the next real login re-syncs it
                banReason: user.banReason || undefined,
                permanentSuspensionReason: user.permanentSuspensionReason || undefined,
                suspensionAppealStatus: user.suspensionAppeal?.status || undefined,
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
        // fresh too sir — an Admin approving/rejecting mid-session must take effect on the
        // very next request, same "always live, never from the token" rule as role above
        req.User.recruiterApplication = user.recruiterApplication

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

// recruiter gate sir — mirrors isAdmin/isSupport exactly. Recruiter is its own isolated role
// (see Models/User.js), so this is the ONLY gate that lets it through; isUser below already
// excludes it same as it excludes Admin/Support
exports.isRecruiter = (req, res, next) => {
    if (req?.User?.role !== 'Recruiter') {
        return res.status(403).json({
            success: false,
            message: 'This route is for recruiters only',
        })
    }
    next()
}

// approval gate sir — chained AFTER isRecruiter on every recruiter write/management route
// (Routes/Job.js, Routes/Test.js). isRecruiter only confirms the role; this confirms an Admin
// has actually cleared them. A direct-signup Recruiter (see controllers/user.js's createUser)
// starts 'pending' and is fully locked out of every action until approved. A Recruiter promoted
// the old way (Admin's manual role dropdown) has NO recruiterApplication at all — undefined is
// treated as already-approved so that existing path isn't retroactively locked out. A rejected
// application stays locked forever (role is never demoted back to 'User' on rejection, see
// controllers/Admin.js's rejectRecruiterApplication) until a human manually intervenes.
exports.isApprovedRecruiter = (req, res, next) => {
    const status = req?.User?.recruiterApplication?.status
    if (status && status !== 'approved') {
        return res.status(403).json({
            success: false,
            locked: true,
            approvalStatus: status,
            message: status === 'rejected'
                ? 'Your recruiter application was not approved, please contact support'
                : 'Your recruiter account is pending admin approval before you can do this',
        })
    }
    next()
}

// product-feature gate sir — the mirror of isAdmin/isSupport/isRecruiter, for the OTHER direction.
// Every role is strictly isolated to its own dashboard (frontend: PrivateRoute/AdminRoute/
// SupportRoute/RecruiterRoute); this is the server-side enforcement so an Admin/Support/Recruiter
// token can't just call the User-facing product APIs (AI review, chat, resume builder, etc)
// directly, bypassing the frontend guard entirely. Account-management routes (profile, password,
// delete-account, notifications) are NOT behind this — every role still manages its own account.
// NOTE: candidates taking a recruiter's test are still plain 'User' accounts, so test-attempt
// routes in Routes/Test.js intentionally use isUser too — this gate doesn't need to know about
// tests at all.
exports.isUser = (req, res, next) => {
    if (req?.User?.role !== 'User') {
        return res.status(403).json({
            success: false,
            message: 'Admin, Support and Recruiter accounts cannot use this feature — sign in with a normal user account instead',
        })
    }
    next()
}
