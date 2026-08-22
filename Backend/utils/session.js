// THE single place where a session token is minted, and the single place that defines how the
// auth cookie is set or cleared sir.
//
// Before this module, `jwt.sign(...)` plus a hand-written cookie.stringifySetCookie block was
// duplicated across controllers/user.js and all four OAuth controllers. They had already drifted
// (different payload fields, and every one of them used sameSite:'lax'), and any future change
// to session policy meant editing six files and hoping none were missed.
//
// Two real bugs are fixed by centralizing this:
//
//  1. sameSite:'lax' meant the auth cookie was NEVER SENT on cross-site XHR. The frontend
//     (Vercel) and backend (Render) are different origins, so every authenticated API call
//     relied entirely on the localStorage copy of the token in the Authorization header — which
//     is exactly the copy that makes httpOnly pointless. controllers/Payment.js had already hit
//     and fixed this for its own cookie; this brings the auth cookie in line so the httpOnly
//     cookie is a real, working transport and localStorage is no longer load-bearing.
//
//  2. Tokens carry a `tv` (tokenVersion) claim, checked by the Auth middleware against the live
//     user record. That gives us revocation a plain JWT can't have: logout, a password change
//     and account deletion all bump the counter and every previously-issued token dies at once.

const jwt = require('jsonwebtoken')
const cookie = require('cookie')
const { getEffectivePlan } = require('./Plans')

const AUTH_COOKIE = 'token'
const SESSION_DAYS = 7
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60

// sameSite:'none' + secure:true is REQUIRED for the cookie to survive a cross-origin XHR sir
// (frontend and backend are on different domains in production). Browsers refuse sameSite:'none'
// without secure:true, so secure can't be conditional on NODE_ENV.
//
// Local development is the exception: 'none'+secure over plain http://localhost is rejected by
// the browser, and there the two servers are same-site anyway, so 'lax' without secure is used.
const isCrossSite = () => process.env.NODE_ENV === 'production'

const authCookieOptions = () => (
    isCrossSite()
        ? { httpOnly: true, secure: true, sameSite: 'none', path: '/' }
        : { httpOnly: true, secure: false, sameSite: 'lax', path: '/' }
)

// the ONLY token payload shape in the app sir — id identifies the user, tv enables revocation.
// Deliberately minimal: role is NOT in here, because a token minted before a promotion/demotion
// would carry a stale role. Auth middleware always reads the live role from the DB instead.
const signSessionToken = (user) => jwt.sign(
    {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        tv: user.tokenVersion || 0,
    },
    process.env.JWT_PRIVATE_KEY,
    { expiresIn: SESSION_SECONDS }
)

// returns the Set-Cookie string sir — callers that also set other cookies (the OAuth flows clear
// their state cookie at the same time) can put this into an array
const buildAuthCookie = (token) => cookie.stringifySetCookie({
    name: AUTH_COOKIE,
    value: token,
    maxAge: SESSION_SECONDS,
    ...authCookieOptions(),
})

// must mirror buildAuthCookie's attributes exactly sir — a browser only removes a cookie when
// path/secure/sameSite match the ones it was set with
const buildClearAuthCookie = () => cookie.stringifySetCookie({
    name: AUTH_COOKIE,
    value: '',
    maxAge: 0,
    ...authCookieOptions(),
})

// convenience for the common case sir: mint, set the cookie, hand back the token for the body
const issueSession = (res, user, extraCookies = []) => {
    const token = signSessionToken(user)
    res.setHeader('Set-Cookie', [...extraCookies, buildAuthCookie(token)])
    return token
}

// the public shape of a user sir — one definition so login, OAuth and /profile can never drift
// into returning different fields for the same person.
//
// SubType is the EFFECTIVE plan, not the stored column. An expired Pro subscriber still carries
// SubType:'Pro' in the database until the reconcile job demotes them (see
// utils/SubscriptionReconcileCron.js), and the frontend renders whatever this returns as the
// user's current plan — so returning the raw field told lapsed users they were still on Pro.
// getEffectivePlan is the same authority the credit-spend path uses, so what the user is TOLD
// they have now always matches what they can actually DO.
const publicUser = (user) => ({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    SubType: getEffectivePlan(user).key,
    // only meaningful for a Recruiter sir — lets the frontend render the locked-dashboard state
    // (RecruiterLayout.jsx) right after login with no extra /profile call. Undefined for a
    // Recruiter promoted the old manual-Admin-dropdown way (no recruiterApplication at all) —
    // isApprovedRecruiter (Middlewares/Auth.js) treats that the same as already-approved.
    recruiterApprovalStatus: user.role === 'Recruiter'
        ? (user.recruiterApplication?.status || 'approved')
        : undefined,
    // same reasoning as recruiterApprovalStatus above sir — lets the frontend render the
    // locked-dashboard state (PrivateRoute + DashboardLayout's sidebar) right after login,
    // with no extra /profile call needed just to find out the account is suspended
    isBanned: user.isBanned || false,
    banReason: user.isBanned ? user.banReason : undefined,
    suspensionAppealStatus: user.isBanned ? (user.suspensionAppeal?.status || undefined) : undefined,
})

module.exports = {
    AUTH_COOKIE,
    SESSION_SECONDS,
    signSessionToken,
    buildAuthCookie,
    buildClearAuthCookie,
    issueSession,
    publicUser,
    authCookieOptions,
}
