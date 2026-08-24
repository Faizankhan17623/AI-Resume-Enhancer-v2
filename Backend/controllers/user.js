const  cookie = require("cookie");
const bcrypt = require('bcrypt')
const  jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator')
const crypto = require('crypto')

const User = require('../Models/User');
const OTP = require('../Models/OTP.js')
const LoginLog = require('../Models/LoginLog.js')
const ReferralLog = require('../Models/ReferralLog.js')
const mailSender = require('../utils/Nodemailer.js')
const { logSystemAction } = require('../utils/AdminLog.js')

const { deleteAccountEmail } = require('../Templates/DeleteAccount.js')
const {passwordResetTemplate} = require('../Templates/passwordResetTemplate.js')
const { otpEmail } = require('../Templates/OTP.js')
const { referralSuccessTemplate } = require('../Templates/ReferralSuccess.js')
const { issueSession, publicUser, buildClearAuthCookie } = require('../utils/session.js')
const logger = require('../utils/logger.js')
// ============================================================
// CREATE USER (Register)
// ============================================================
exports.createUser = async (req, res) => {
    try {

        const { firstName, lastName, email, password, number ,Code,otp} = req.body ;
        // recruiter fast-track signup sir — see Validation/schemas.js's createUserSchema for the
        // conditional-required rules on these five when accountType is 'Recruiter'
        const { accountType, companyName, companyWebsite, companySize, location, hiringNeeds } = req.body
        const { referralCode } = req.body

        // not case sir
        if (!firstName || !lastName || !email || !password || !number || !Code || !otp) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
        }

        // phone number must be exactly 10 digits sir — same rule as the frontend
        if (!/^[0-9]{10}$/.test(number)) {
            return res.status(400).json({
                success: false,
                field: 'number',
                message: 'Phone number must be exactly 10 digits',
            });
        }

        // duplication checks sir — separate so the UI can show a field-specific error

        // firstName already taken
        const existingFirstName = await User.findOne({ firstName: firstName });
        if (existingFirstName) {
            return res.status(409).json({
                success: false,
                field: 'firstName',
                message: 'This username is already taken',
            });
        }

        // email already taken
        const existingEmail = await User.findOne({ email: email });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                field: 'email',
                message: 'A user with this email already exists',
            });
        }

        // number already taken
        const existingNumber = await User.findOne({ number: number });
        if (existingNumber) {
            return res.status(409).json({
                success: false,
                field: 'number',
                message: 'This number is already registered',
            });
        }

        // Otp Verification — grab the most recent otp for this email sir
        const recentOtp = await OTP.findOne({ email: email }).sort({ createdAt: -1 });

        // not case sir — no otp was ever generated for this email
        if (!recentOtp) {
            return res.status(400).json({
                success: false,
                field: 'otp',
                message: 'OTP not found, please request a new one',
            });
        }

        // not case sir — the otp the user sent does not match the latest one
        if (String(recentOtp.otp) !== String(otp)) {
            return res.status(400).json({
                success: false,
                field: 'otp',
                message: 'Invalid OTP, please try again',
            });
        }

        const saltRounds = 10
        const hashing = await bcrypt.hash(password, saltRounds)

        // not case sir — hashing failed for some reason
        if (!hashing) {
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while securing the password',
            });
        }

        // recruiter fast-track sir — role is set to 'Recruiter' right here at signup, no
        // separate promotion step. The account is NOT trusted yet though: recruiterApplication
        // starts 'pending', and isApprovedRecruiter (Middlewares/Auth.js) blocks every
        // recruiter write action until an Admin approves it via Admin/RecruiterApplications.jsx
        // — same review queue the post-hoc /For-Recruiters flow already uses.
        const isRecruiterSignup = accountType === 'Recruiter'

        // referral link resolution sir — a code that doesn't match anyone (stale link, typo,
        // tampered) is silently ignored rather than blocking the signup; referredBy just stays
        // unset and no bonus is ever paid out for it. The actual bonus is granted later, on this
        // new account's first real login (see loginUser below) — not here — so a fake account
        // that's created but never logged into can't be farmed for free credits.
        let referredBy
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: referralCode.trim() }).select('_id')
            if (referrer) referredBy = referrer._id
        }

        const Creation = await User.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashing,
            number: number,
            CountryCode: Code,
            Verified: false,
            ...(referredBy ? { referredBy } : {}),
            ...(isRecruiterSignup ? {
                role: 'Recruiter',
                recruiterApplication: {
                    companyName,
                    companyWebsite,
                    companySize,
                    location,
                    hiringNeeds,
                    status: 'pending',
                },
            } : {}),
        })

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            // never the raw doc sir — Creation carries the bcrypt password/confirmpassword hash,
            // and the frontend only needs to know it worked before redirecting to /Login
            user: {
                _id: Creation._id,
                firstName: Creation.firstName,
                role: Creation.role,
                lastName: Creation.lastName,
                email: Creation.email,
            },
        });
    } catch (error) {
        (req.log || logger).error('create user failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to create user',
        });
    }
};

// account lockout policy sir — tune ONLY here
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// referral program policy sir — tune ONLY here. Credits are granted by moving `count` (credits
// USED, see utils/Plans.js's consumeCredit) backwards, same direction as refundCredit — giving a
// bonus means letting the user use N more before hitting their plan's cap.
const REFERRAL_BONUS_CREDITS = 5
// caps how many times ONE referrer can be paid out sir — without this, two colluding accounts
// (or one person's two emails) could loop signup+login indefinitely for free credits
const MAX_REFERRALS_PER_USER = 10

// pays out the referral bonus sir, called from loginUser on the referred user's first login.
// The findOneAndUpdate below is the actual race guard: it flips referralBonusGranted from
// false->true and only proceeds if THIS call is the one that flipped it, so two concurrent
// logins for the same account (double-click, retry) can never pay out twice. The referrer's cap
// check happens first and simply skips the CREDIT part (not an error, and the invite still gets
// logged) once MAX_REFERRALS_PER_USER is reached.
//
// Credits only ever move for a User referrer AND a User referee sir — a Recruiter can refer or
// be referred (the link/card is visible to them too, per the Account page), but Recruiters don't
// spend AI review credits so there is nothing meaningful to bonus. Every successful referral
// still gets a ReferralLog row regardless of role, with bonusCredits: 0 in the no-credit case, so
// the invite DASHBOARD (who you invited, when) is accurate for every role even when no money/
// credits changed hands.
const grantReferralBonus = async (referredUser, referrerId) => {
    const referrer = await User.findById(referrerId).select('firstName lastName email role referralCount count')
    if (!referrer) return

    const claimed = await User.findOneAndUpdate(
        { _id: referredUser._id, referralBonusGranted: false },
        { referralBonusGranted: true },
        { new: true }
    ).select('count')
    if (!claimed) return // sir — another concurrent call already paid this account out

    const bothAreUsers = referrer.role === 'User' && referredUser.role === 'User'
    const underCap = referrer.referralCount < MAX_REFERRALS_PER_USER
    const grantCredits = bothAreUsers && underCap

    if (grantCredits) {
        // count can never go below zero sir — same clamp Admin.js's adjustCredits uses. A raw
        // $inc could take it negative, which the Account page's credits-used progress bar
        // (creditsUsed / creditsLimit) would render as a negative-width bar.
        await User.findByIdAndUpdate(referredUser._id, { count: Math.max(0, claimed.count - REFERRAL_BONUS_CREDITS) })
    }

    // referralCount (the dashboard's "X of 10 used" cap display) only climbs for the credit-
    // earning case sir — a Recruiter referral doesn't consume any of the cap since it never
    // costs anything to grant
    let updatedReferrerCount = referrer.count
    if (grantCredits) {
        const updatedReferrer = await User.findOneAndUpdate(
            { _id: referrerId, referralCount: { $lt: MAX_REFERRALS_PER_USER } },
            { $inc: { referralCount: 1 } },
            { new: true }
        ).select('count')
        if (updatedReferrer) {
            updatedReferrerCount = Math.max(0, updatedReferrer.count - REFERRAL_BONUS_CREDITS)
            await User.findByIdAndUpdate(referrerId, { count: updatedReferrerCount })
        }
    }

    const grantedAt = new Date()
    const bonusCredits = grantCredits ? REFERRAL_BONUS_CREDITS : 0

    // fire-and-forget sir — a logging/email failure must never undo a real credit grant that
    // already landed above
    ReferralLog.create({
        referrer: referrerId,
        referredUser: referredUser._id,
        referredUserName: `${referredUser.firstName} ${referredUser.lastName}`,
        referredUserEmail: referredUser.email,
        bonusCredits,
    }).catch((err) => logger.error('referral log failed', { err, referrerId, referredUserId: referredUser._id }))

    mailSender(
        referrer.email,
        'Your Invite Was Successful',
        referralSuccessTemplate(referrer.firstName, `${referredUser.firstName} ${referredUser.lastName}`, bonusCredits, grantedAt)
    ).catch((err) => logger.error('referral success email failed', { err, referrerId }))
}

// ============================================================
// LOGIN USER
// ============================================================
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // not case sir
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        // find the user by email from the db sir
        const existingUser = await User.findOne({ email: email });

        // not case sir — no account is registered with this email
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                field: 'email',
                message: 'No account found with this email',
            });
        }

        // locked sir — per-ACCOUNT lockout, on top of the IP rate limiter, so a distributed
        // brute-force (many IPs, one target account) still gets stopped
        if (existingUser.lockUntil && existingUser.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((existingUser.lockUntil - Date.now()) / 60000)
            return res.status(423).json({
                success: false,
                message: `Too many failed login attempts, please try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`,
            });
        }

        // an OAuth account (Google/Facebook/GitHub/LinkedIn) sir — it carries a placeholder
        // password hash it can never actually be logged into with, point them at the right
        // sign-in method instead. Also covers older OAuth accounts with no password at all.
        if (existingUser.provider !== 'local' || !existingUser.password) {
            return res.status(400).json({
                success: false,
                field: 'password',
                message: `This account signs in with ${existingUser.provider === 'local' ? 'a provider' : existingUser.provider.charAt(0).toUpperCase() + existingUser.provider.slice(1)} — use the matching "Continue with..." button instead`,
            });
        }

        // compare the entered password with the stored hash sir
        const Comparing = await bcrypt.compare(password, existingUser.password)

        // not case sir — the password does not match the stored one
        if (!Comparing) {
            const attempts = existingUser.failedLoginAttempts + 1
            const update = { failedLoginAttempts: attempts }
            // lock only once the threshold is crossed sir — a past lock has already expired by now
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                update.lockUntil = new Date(Date.now() + LOCK_DURATION_MS)
                update.failedLoginAttempts = 0
                // one entry per lockout, not per failed attempt, sir — keeps the audit log
                // signal-heavy instead of drowning it in every bad password guess
                logSystemAction('ACCOUNT_LOCKOUT', { email: existingUser.email }, { lockedUntil: update.lockUntil })
            }
            await User.findByIdAndUpdate(existingUser._id, update)

            return res.status(401).json({
                success: false,
                field: 'password',
                message: 'Incorrect password, please try again',
            });
        }

        // a successful login clears any prior strikes sir
        if (existingUser.failedLoginAttempts > 0 || existingUser.lockUntil) {
            await User.findByIdAndUpdate(existingUser._id, { failedLoginAttempts: 0, lockUntil: null })
        }

        // account scheduled for deletion sir — logging back in within the 2-day buffer recovers
        // it (same window check as recoverAccount below), matching what the deletion email
        // promises; past the window the account is gone for good so login is refused
        let accountRecovered = false
        if (existingUser.Buffer) {
            const [dd, mm, yy] = existingUser.BufferTiming.split('/')
            const deletionDate = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd))

            if (Date.now() > deletionDate.getTime()) {
                return res.status(410).json({
                    success: false,
                    message: 'This account was permanently deleted, please sign up again',
                })
            }

            await User.findByIdAndUpdate(existingUser._id, { Buffer: false, BufferTiming: null })
            existingUser.Buffer = false
            accountRecovered = true
        }

        const {_id,firstName,lastName} = existingUser

        // `User.id = existingUser._id` used to be assigned here sir — that set a property on the
        // mongoose MODEL itself (process-global, shared by every concurrent request) and then read
        // it back for the update. Under any concurrency two simultaneous logins could clobber each
        // other's id and write one user's token onto another user's record. Removed entirely; the
        // local _id is used directly.
        //
        // Token minting and the cookie now come from utils/session.js sir — one definition shared
        // with the four OAuth flows, and it sets the cross-site cookie attributes that actually
        // let the cookie reach a browser on a different origin.
        const JwtCreation = issueSession(res, existingUser)

        // referral bonus sir — paid out on this account's FIRST successful login, not at signup.
        // existingUser.Verified is still the pre-login value here (the flip happens in the update
        // right below), so `!Verified` is exactly "never logged in before" — the strongest signal
        // this codebase has that the account is real, not a fake farmed purely for the bonus.
        // Fire-and-forget: a referral-bonus failure must never block the login itself.
        if (!existingUser.Verified && existingUser.referredBy && !existingUser.referralBonusGranted) {
            grantReferralBonus(existingUser, existingUser.referredBy).catch((err) =>
                logger.error('referral bonus grant failed', { err, userId: existingUser._id })
            )
        }

        await User.findByIdAndUpdate(_id, { token: JwtCreation, Verified: true })

        // fire-and-forget sir — same pattern as logAi/logAction, a logging failure must never block a real login
        LoginLog.create({
            user: _id,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        }).catch((err) => logger.error('login log failed', { err: err }))

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            // the httpOnly cookie set above is the REAL credential sir. The token is still
            // returned in the body as an Authorization-header fallback for browsers that block
            // third-party cookies outright — but the frontend no longer persists it to
            // localStorage, so it lives only in memory for the tab's lifetime.
            token: JwtCreation,
            accountRecovered,
            user: publicUser(existingUser)
        });

    } catch (error) {
        logger.error('login failed', { err: error });
        return res.status(500).json({
            success: false,
            message: 'Failed to login',
        });
    }
};

// ============================================================
// LOGOUT
// ============================================================
// There was previously NO logout endpoint at all sir — the frontend simply dropped its local
// copy of the token, while the token itself stayed valid server-side for its remaining 7 days.
// Anyone who had captured it (shared machine, proxy log, XSS) kept full access after the user
// believed they had signed out.
//
// This bumps tokenVersion, which invalidates every token ever issued to this account, and
// clears the cookie with attributes matching how it was set so the browser actually drops it.
exports.logoutUser = async (req, res) => {
    try {
        const userId = req.User.id

        await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 }, token: null })

        res.setHeader('Set-Cookie', buildClearAuthCookie())

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        })
    } catch (error) {
        logger.error('logout failed', { err: error, userId: req?.User?.id })
        return res.status(500).json({
            success: false,
            message: 'Failed to log out',
        })
    }
}

// Send Otp 
exports.SendOtp = async(req,res)=>{
    try {

        const {email} = req.body


         const checkUserPresent = await User.findOne({ email:email })
        if (checkUserPresent) {
      
            return res.status(401).json({
                success: false,
                message: `User is Already Registered`,
            })
    }
        let OtpCreate = otpGenerator.generate(6, {
            upperCaseAlphabets:false,
            specialChars:false,
            digits :true,
            lowerCaseAlphabets :false
        })

        let result = await OTP.findOne({ otp: OtpCreate })

        while(result){
            OtpCreate = otpGenerator.generate(6, {
            upperCaseAlphabets:false,
            specialChars:false,
            digits :true,
            lowerCaseAlphabets :false
        })

            result = await OTP.findOne({ otp: OtpCreate })

        }

        const otpPayload = { email, otp: OtpCreate }
        await OTP.create(otpPayload)

        // never echo the OTP back in the response sir — it must only reach the user via
        // email; returning it here would let anyone who can call this endpoint read the
        // code straight from the Network tab and skip email verification entirely

        // OTP is already persisted at this point sir — the email send is a separate,
        // best-effort step now (see Models/OTP.js for why this moved out of a pre-save
        // hook). A relay hiccup must not fail the signup request when the OTP itself
        // saved fine, so this gets its own try/catch instead of falling into the outer one.
        try {
            await mailSender(email, "Verification Email", otpEmail(OtpCreate))
        } catch (mailError) {
            (req.log || logger).error('OTP email delivery failed', { err: mailError, email })
            return res.status(200).json({
                success: true,
                message: 'OTP created, but the verification email is delayed — please try again shortly if it does not arrive',
            })
        }

        res.status(200).json({
            success: true,
            message: `OTP Sent Successfully`,
        })

    } catch (error) {
        (req.log || logger).error('send otp failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to Send Otp',
        });
    }
}

// ============================================================
// UPDATE FIRST NAME
// ============================================================
exports.updateFirstName = async (req, res) => {
    try {
        const { firstName } = req.body;

        // not case sir
        if (!firstName) {
            return res.status(400).json({
                success: false,
                message: 'First name is required',
            });
        }

        // findOne checker sir — is this first name already taken
        const existingFirstName = await User.findOne({ firstName: firstName });
        if (existingFirstName) {
            return res.status(409).json({
                success: false,
                field: 'firstName',
                message: 'This first name is already taken',
            });
        }

        // logged-in user id from the auth middleware sir
        const userId = req.User.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { firstName: firstName },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'First name updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        (req.log || logger).error('update first name failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to update first name',
        });
    }
};

// ============================================================
// UPDATE LAST NAME
// ============================================================
exports.updateLastName = async (req, res) => {
    try {
        const { lastName } = req.body;

        // not case sir
        if (!lastName) {
            return res.status(400).json({
                success: false,
                message: 'Last name is required',
            });
        }

        // findOne checker sir — is this last name already taken
        const existingLastName = await User.findOne({ lastName: lastName });
        if (existingLastName) {
            return res.status(409).json({
                success: false,
                field: 'lastName',
                message: 'This last name is already taken',
            });
        }

        // logged-in user id from the auth middleware sir
        const userId = req.User.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { lastName: lastName },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Last name updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        (req.log || logger).error('update last name failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to update last name',
        });
    }
};

// ============================================================
// UPDATE PASSWORD
// ============================================================
exports.updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmNewPassword } = req.body;

        // not case sir
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required',
            });
        }

        // new password and confirm new password must match sir
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                field: 'confirmNewPassword',
                message: 'New password and confirm password do not match',
            });
        }

        // logged-in user id from the auth middleware sir
        const userId = req.User.id;

        // find the user from the db sir
        const existingUser = await User.findById(userId);

        // not case sir — user not found
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // compare the old password with the stored hash sir — OAuth accounts go through this
        // exact same check too, their stored hash is just the shared "Oauth123" placeholder
        // (see GoogleAuth.js etc) until they set a real one here for the first time
        const Comparing = await bcrypt.compare(oldPassword, existingUser.password);

        // not case sir — the old password does not match the stored one
        if (!Comparing) {
            return res.status(401).json({
                success: false,
                field: 'oldPassword',
                message: 'Password not matched',
            });
        }

        // not case sir — new password can't be the same as the current one
        const SameAsOld = await bcrypt.compare(newPassword, existingUser.password);
        if (SameAsOld) {
            return res.status(400).json({
                success: false,
                field: 'newPassword',
                message: 'New password cannot be the same as your current password',
            });
        }

        // hash the new password before saving sir
        const saltRounds = 10;
        const hashing = await bcrypt.hash(newPassword, saltRounds);

        // save the new hashed password and revoke every existing session sir — changing a
        // password must log out every OTHER device, which is the whole point of changing it
        // when you suspect it's compromised
        const updated = await User.findByIdAndUpdate(
            userId,
            {
                password: hashing,
                $inc: { tokenVersion: 1 },
            },
            { returnDocument: 'after' }
        );

        // ...but keep THIS device signed in sir — the user is right here and just proved they
        // know the old password. Re-issue a token carrying the new version so their current
        // session survives while all the others die.
        const token = issueSession(res, updated)
        await User.findByIdAndUpdate(userId, { token })

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            token,
        });
    } catch (error) {
        logger.error('password update failed', { err: error, userId: req?.User?.id });
        return res.status(500).json({
            success: false,
            message: 'Failed to update password',
        });
    }
};

// ============================================================
// UPDATE EMAIL
// ============================================================
exports.updateEmail = async (req, res) => {
    try {

          const userId = req.User.id;
        const { email } = req.body;

        // not case sir
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }

        // findOne checker sir — is this email already taken by someone else
        const existingEmail = await User.findOne({ email: email });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                field: 'email',
                message: 'This email is already in use',
            });
        }

        // logged-in user id from the auth middleware sir
      

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { email: email },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        (req.log || logger).error('update email failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to update email',
        });
    }
};

// ============================================================
// UPDATE NUMBER
// ============================================================
exports.updateNumber = async (req, res) => {
    try {
          const userId = req.User.id;
        const { number } = req.body;

        // not case sir
        if (!number) {
            return res.status(400).json({
                success: false,
                message: 'Number is required',
            });
        }

        // phone number must be exactly 10 digits sir — same rule as the frontend
        if (!/^[0-9]{10}$/.test(number)) {
            return res.status(400).json({
                success: false,
                field: 'number',
                message: 'Phone number must be exactly 10 digits',
            });
        }

        // findOne checker sir — is this number already taken
        const existingNumber = await User.findOne({ number: number });
        if (existingNumber) {
            return res.status(409).json({
                success: false,
                field: 'number',
                message: 'This number is already registered',
            });
        }

        // logged-in user id from the auth middleware si

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { number: number },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Number updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        (req.log || logger).error('update number failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to update number',
        });
    }
};

// ============================================================
// FORGOT PASSWORD (send reset link via email)
// ============================================================
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // const userid  = req.User.id

        // not case sir
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }

        const token = crypto.randomBytes(20).toString("hex")

          const user = await User.findOneAndUpdate(
            { email: email },
            {
                // separate field from the session JWT sir (`token`) — sharing one field meant
                // logging in (password or OAuth) after requesting a reset silently clobbered
                // the emailed reset link, and requesting a reset clobbered the last-issued JWT
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000,
            },
            { returnDocument: 'after' }

            )

        // not case sir — no account is registered with this email
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email',
            });
        }


        // FRONTEND_URL can be a comma-separated list (same var CORS reads in index.js) sir —
        // an email link needs exactly ONE origin, so take the first and strip trailing slashes
        const frontendUrl = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
            : "http://localhost:5173"
        const url = `${frontendUrl}/reset-password/${token}`

        // token is already persisted at this point sir — the send itself gets its own
        // try/catch so a relay hiccup doesn't surface as a generic 500 (which, unlike other
        // failure modes here, would also leak nothing new — same "sent" wording either way
        // keeps us from revealing whether the email is registered)
        try {
            await mailSender(
                email,
                "Reset Your  Password",
                passwordResetTemplate(`${user.firstName} ${user.lastName}`, url)
            )
        } catch (mailError) {
            (req.log || logger).error('password reset email delivery failed', { err: mailError, email })
            return res.status(200).json({
                success: true,
                message: 'If that email is registered, a reset link is on its way — if it does not arrive shortly, please try again',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Password reset email sent',
        });
    } catch (error) {
        // email is the useful correlator here sir — it's the thing being reset
        ;(req.log || logger).error('forgot password failed', { err: error, email })
        return res.status(500).json({
            success: false,
            message: 'Failed to send reset email',
        });
    }
};

// ============================================================
// RESET PASSWORD (via token from email)
// ============================================================
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmNewPassword } = req.body;

        // not case sir
        if (!token || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password fields are required',
            });
        }

         if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password Does not Match",
      })
    }
    const userDetails = await User.findOne({ resetPasswordToken: token })
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "Token is Invalid",
      })
    }
    if (!(userDetails.resetPasswordExpires > Date.now())) {
      return res.status(403).json({
        success: false,
        message: `Token is Expired, Please Regenerate Your Token`,
      })
    }

    // an OAuth account's stored hash is the shared internal placeholder sir (see
    // services/oauth.js's OAUTH_DEFAULT_PASSWORD), never something the user actually knows or
    // typed — comparing against it here would either false-positive-block a real password that
    // coincidentally isn't the placeholder's opposite, or just be meaningless noise either way.
    // Only a 'local' account (or one already converted by a prior reset) has a real password
    // worth diffing against.
    if (userDetails.provider === 'local') {
      const SameAsOld = await bcrypt.compare(newPassword, userDetails.password)
      if (SameAsOld) {
        return res.status(400).json({
          success: false,
          message: 'New password cannot be the same as your current password',
        })
      }
    }

      const encryptedPassword = await bcrypt.hash(newPassword, 10)
    // clear resetPasswordToken so this one-time link can't be replayed, and bump tokenVersion
    // sir — a password reset is the one action that MUST kill every existing session. The whole
    // reason someone resets a password is that it may be compromised; leaving already-issued
    // JWTs valid for their remaining 7 days meant an attacker who had a token kept full access
    // straight through the reset. Bumping the version invalidates all of them at once.
    //
    // provider -> 'local' sir: this is what actually unlocks email+password login for an account
    // that signed up via Google/GitHub/etc. Completing this reset (proving control of the inbox
    // behind the account's email) is the same proof-of-ownership loginUser normally gets from a
    // correct password, so it's the right moment to enable the second sign-in method. The OAuth
    // button keeps working too — services/oauth.js's account-linking logic (a 'local' account
    // matched by provider email) is exactly what makes both paths resolve to the same account
    // going forward, without needing providerId touched here at all.
    await User.findOneAndUpdate(
      { resetPasswordToken: token },
      {
        password: encryptedPassword,
        provider: 'local',
        resetPasswordToken: null,
        resetPasswordExpires: null,
        token: null,
        $inc: { tokenVersion: 1 },
      },
      { returnDocument: 'after' }
    )
        return res.status(200).json({
            success: true,
            message: 'Password reset successfully, please log in again',
        });
    } catch (error) {
        logger.error('password reset failed', { err: error });
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password',
        });
    }
};

// ============================================================
// EXPORT MY DATA — GDPR-style self-service dump sir, distinct from delete-account
// ============================================================
exports.exportMyData = async (req, res) => {
    try {
        const userId = req.User.id

        const Review = require('../Models/Review')
        const Chat = require('../Models/Chat')
        const CoverLetter = require('../Models/CoverLetter')
        const Resume = require('../Models/Resume')
        const BuiltResume = require('../Models/BuiltResume')
        const Payment = require('../Models/Payment')

        const user = await User.findById(userId)
            .select('-password -token -resetPasswordToken -resetPasswordExpires')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // every model here is already scoped by `user` sir — same fields the account page
        // and history views already show the user, just all in one downloadable file
        const [reviews, chats, coverLetters, resumes, builtResumes, payments] = await Promise.all([
            Review.find({ user: userId }),
            Chat.find({ user: userId }),
            CoverLetter.find({ user: userId }),
            Resume.find({ user: userId }).select('-resumeText'),
            BuiltResume.find({ user: userId }),
            Payment.find({ user: userId }).select('-signature'),
        ])

        return res.status(200).json({
            success: true,
            exportedAt: new Date().toISOString(),
            user,
            reviews,
            chats,
            coverLetters,
            resumes,
            builtResumes,
            payments,
        })
    } catch (error) {
        (req.log || logger).error('export my data failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to export your data',
        })
    }
}

// ============================================================
// DELETE ACCOUNT
// ============================================================
exports.deleteAccount = async (req, res) => {
    try {
        // logged-in user id from the auth middleware sir
        const userId = req.User.id;

        // find the user first so we have their email for the mail sir
        const existingUser = await User.findById(userId);

        // not case sir — user not found
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // don't re-schedule an account that is already suspended sir
        if (existingUser.Buffer) {
            return res.status(400).json({
                success: false,
                message: 'Account is already scheduled for deletion',
            });
        }

        // build the deletion date — 2 days from now sir
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 2);

        // store it as a dd/mm/yy string sir (padded so it always parses back cleanly)
        const dd = String(deletionDate.getDate()).padStart(2, '0');
        const mm = String(deletionDate.getMonth() + 1).padStart(2, '0');
        const yy = String(deletionDate.getFullYear()).slice(-2);
        const bufferTiming = `${dd}/${mm}/${yy}`;

        // suspend the account into the buffer instead of deleting it now sir. tokenVersion is
        // bumped here too — every OTHER state-changing auth event (logout, password change,
        // password reset) already revokes existing tokens the same way, and scheduling your own
        // account for deletion is exactly that kind of event. Without this, a token issued before
        // this call keeps validating for the rest of its 7-day life (Auth.js only rejects it via
        // the separate Buffer/isBanned checks, which a still-open second tab would hit, but if the
        // account is later recovered by logging back in, that old token would become fully valid
        // again with no re-authentication ever required).
        await User.findByIdAndUpdate(userId, {
            Buffer: true,
            BufferTiming: bufferTiming,
            $inc: { tokenVersion: 1 },
        });

        res.setHeader('Set-Cookie', buildClearAuthCookie())

        // email the user that the account is scheduled for deletion sir
        try {
            await mailSender(
                existingUser.email,
                'Your Account Is Scheduled for Deletion',
                deleteAccountEmail(
                    existingUser.email,
                    existingUser.firstName,
                    existingUser.lastName,
                    bufferTiming
                )
            );
        } catch (mailError) {
            // don't fail the whole request just because the mail didn't send sir
            (req.log || logger).error('Delete-account mail failed', { err: mailError });
        }

        return res.status(200).json({
            success: true,
            message: 'Account scheduled for deletion. You have 2 days to recover it by logging back in.',
            deletionDate: bufferTiming,
        });
    } catch (error) {
        (req.log || logger).error('delete account failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to delete account',
        });
    }
};

// ============================================================
// RECOVER ACCOUNT (undo the scheduled deletion within the buffer window)
// ============================================================
exports.recoverAccount = async (req, res) => {
    try {
        // logged-in user id from the auth middleware sir
        const userId = req.User.id;

        // find the user from the db sir
        const existingUser = await User.findById(userId);

        // not case sir — user not found
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // not case sir — the account is not scheduled for deletion, nothing to recover
        if (!existingUser.Buffer) {
            return res.status(400).json({
                success: false,
                message: 'Account is not scheduled for deletion',
            });
        }

        // parse the stored dd/mm/yy string back into a real date sir
        const [dd, mm, yy] = existingUser.BufferTiming.split('/');
        const deletionDate = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd));

        // not case sir — the 2 day buffer window has already passed
        if (Date.now() > deletionDate.getTime()) {
            return res.status(410).json({
                success: false,
                message: 'Recovery window has expired, the account can no longer be recovered',
            });
        }

        // lift the suspension — clear the buffer flags so the account is active again sir
        await User.findByIdAndUpdate(userId, {
            Buffer: false,
            BufferTiming: null,
        });

        return res.status(200).json({
            success: true,
            message: 'Account recovered successfully',
        });

    } catch (error) {
        (req.log || logger).error('recover account failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to recover account',
        });
    }
};
// ============================================================
// GET PROFILE — everything the Account page needs in one call sir
// ============================================================
exports.getProfile = async (req, res) => {
    try {
        const id = req?.User.id

        const user = await User.findById(id)
            .select('firstName lastName email number CountryCode role Verified provider Subscription SubType SubscriptionExpires count createdAt notifyStreak notifyWinBack notifyDigest notifyHealthCheck notifyInterviewPrep onboardingCompleted recruiterApplication')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found, please log in again',
            });
        }

        // the effective plan sir — an expired Pro is a Basic again
        const { getEffectivePlan } = require('../utils/Plans')
        const plan = getEffectivePlan(user)

        // activity counts for the account page + the dashboard onboarding checklist sir
        const Review = require('../Models/Review')
        const Chat = require('../Models/Chat')
        const Resume = require('../Models/Resume')
        const CoverLetter = require('../Models/CoverLetter')
        const [reviewCount, chatCount, resumeCount, coverLetterCount] = await Promise.all([
            Review.countDocuments({ user: id }),
            Chat.countDocuments({ user: id }),
            Resume.countDocuments({ user: id }),
            CoverLetter.countDocuments({ user: id }),
        ])

        // Basic/Pro/ProMax is a User-only concept sir — an Admin/Support account never has
        // a real plan, so don't hand back a fake "Basic" here, null makes that explicit
        return res.status(200).json({
            success: true,
            // SubType overridden with the EFFECTIVE plan sir. The stored column stays 'Pro' until
            // the reconcile job demotes an expired subscriber (utils/SubscriptionReconcileCron.js),
            // and the frontend caches this object and renders user.SubType as the current plan —
            // so returning the raw column told lapsed users they were still on Pro.
            user: { ...user.toObject(), SubType: plan.key },
            plan: user.role === 'User' ? {
                key: plan.key,
                name: plan.name,
                creditsUsed: user.count,
                creditsLimit: plan.credits,          // null means unlimited sir
                maxMessagesPerChat: plan.maxMessagesPerChat,
                expiresAt: plan.key === 'Basic' ? null : user.SubscriptionExpires,
            } : null,
            activity: {
                reviewCount,
                chatCount,
                resumeCount,
                coverLetterCount,
            }
        });
    } catch (error) {
        (req.log || logger).error('get profile failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to get the profile',
        });
    }
};

// ============================================================
// UPDATE NOTIFICATION PREFERENCES — per-type email opt-out sir
// ============================================================
exports.updateNotificationPrefs = async (req, res) => {
    try {
        const userId = req.User.id;
        const { notifyStreak, notifyWinBack, notifyDigest, notifyHealthCheck, notifyInterviewPrep } = req.body;

        // only touch the fields the caller actually sent sir, so a partial update never resets the others
        const updates = {};
        if (typeof notifyStreak === 'boolean') updates.notifyStreak = notifyStreak;
        if (typeof notifyWinBack === 'boolean') updates.notifyWinBack = notifyWinBack;
        if (typeof notifyDigest === 'boolean') updates.notifyDigest = notifyDigest;
        if (typeof notifyHealthCheck === 'boolean') updates.notifyHealthCheck = notifyHealthCheck;
        if (typeof notifyInterviewPrep === 'boolean') updates.notifyInterviewPrep = notifyInterviewPrep;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one notification preference is required',
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })
            .select('notifyStreak notifyWinBack notifyDigest notifyHealthCheck notifyInterviewPrep');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification preferences updated',
            notifyStreak: updatedUser.notifyStreak,
            notifyWinBack: updatedUser.notifyWinBack,
            notifyDigest: updatedUser.notifyDigest,
            notifyHealthCheck: updatedUser.notifyHealthCheck,
            notifyInterviewPrep: updatedUser.notifyInterviewPrep,
        });
    } catch (error) {
        (req.log || logger).error('update notification prefs failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to update notification preferences',
        });
    }
};

// ============================================================
// COMPLETE ONBOARDING — dismiss the dashboard checklist for good sir
// ============================================================
exports.completeOnboarding = async (req, res) => {
    try {
        const userId = req.User.id;

        const updatedUser = await User.findByIdAndUpdate(userId, { onboardingCompleted: true }, { new: true })
            .select('onboardingCompleted');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Onboarding marked complete',
            onboardingCompleted: updatedUser.onboardingCompleted,
        });
    } catch (error) {
        (req.log || logger).error('complete onboarding failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Failed to update onboarding status',
        });
    }
};

// ============================================================
// APPLY FOR RECRUITER ACCESS — self-signup, pending Admin approval sir
// ============================================================
// POST /recruiter-applications — body: { companyName, companyWebsite, companySize, location,
// hiringNeeds }, all required. Only a plain 'User' can apply (isUser-gated route); role stays
// 'User' until an Admin approves it (see
// controllers/Admin.js's approveRecruiterApplication, which is what actually flips the role).
exports.applyForRecruiter = async (req, res) => {
    try {
        const userId = req.User.id
        const { companyName, companyWebsite, companySize, location, hiringNeeds } = req.body

        const user = await User.findById(userId).select('recruiterApplication role')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        // already a pending request sir — block resubmission rather than silently overwriting
        // it, so an Admin reviewing the queue isn't looking at stale details mid-edit
        if (user.recruiterApplication?.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'You already have a recruiter application under review',
            })
        }

        user.recruiterApplication = {
            companyName,
            companyWebsite,
            companySize,
            location,
            hiringNeeds,
            status: 'pending',
            reviewedBy: undefined,
            reviewedAt: undefined,
            rejectionReason: undefined,
        }
        await user.save()

        return res.status(200).json({
            success: true,
            message: 'Your recruiter application has been submitted for review',
            recruiterApplication: user.recruiterApplication,
        })
    } catch (error) {
        (req.log || logger).error('apply for recruiter failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while submitting your application',
        })
    }
}

// ============================================================
// APPEAL A SUSPENSION — the one thing a banned account can still do sir
// ============================================================
// POST /appeal-suspension — body: { message }. Auth-gated same as every other route, but
// Auth.js explicitly exempts this exact path from its ban block, so a banned user can still
// reach it (they still need a valid, non-revoked session — this isn't open to the public).
exports.submitSuspensionAppeal = async (req, res) => {
    try {
        const userId = req.User.id
        const { message } = req.body

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please explain why your account should be un-suspended',
            })
        }

        const user = await User.findById(userId).select('isBanned banReason suspensionAppeal')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        // not case sir — nothing to appeal, this route only makes sense for a banned account
        if (!user.isBanned) {
            return res.status(400).json({
                success: false,
                message: 'Your account is not currently suspended',
            })
        }

        // one open appeal at a time sir, same "block resubmission" rule as applyForRecruiter —
        // an Admin reviewing the queue shouldn't see the message change out from under them
        if (user.suspensionAppeal?.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Your appeal is already under review',
            })
        }

        user.suspensionAppeal = {
            message: message.trim(),
            status: 'pending',
            submittedAt: new Date(),
            reviewedBy: undefined,
            reviewedAt: undefined,
        }
        await user.save()

        return res.status(200).json({
            success: true,
            message: 'Your appeal has been sent to the admin team for review',
            suspensionAppeal: user.suspensionAppeal,
        })
    } catch (error) {
        (req.log || logger).error('appeal suspension failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while submitting your appeal',
        })
    }
}

// ============================================================
// REFERRAL STATS — the Account page's "Invite friends" card sir
// ============================================================
exports.getReferralStats = async (req, res) => {
    try {
        const id = req.User.id
        const user = await User.findById(id).select('referralCode referralCount')

        // backfill sir — the pre('save') hook in Models/User.js only mints a code for a BRAND
        // NEW document (isNew), so every account created before this feature shipped has no
        // referralCode and would otherwise show a broken /Signup?ref=undefined link forever.
        // Minting it here, on first-ever request, self-heals every existing account with no
        // migration script needed.
        if (!user.referralCode) {
            user.referralCode = crypto.randomBytes(4).toString('hex')
            await user.save()
        }

        return res.status(200).json({
            success: true,
            referralCode: user.referralCode,
            referralCount: user.referralCount,
            maxReferrals: MAX_REFERRALS_PER_USER,
            bonusCredits: REFERRAL_BONUS_CREDITS,
        })
    } catch (error) {
        (req.log || logger).error('get referral stats failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your referral stats',
        })
    }
}

// ============================================================
// REFERRAL HISTORY — the Account page's referral dashboard sir:
// who was invited, when, how much, plus week/month/year/custom totals
// ============================================================
exports.getReferralHistory = async (req, res) => {
    try {
        const id = req.User.id

        // the full invite list sir — newest first, this codebase's referral volume per user is
        // small (capped at 10 credit-earning ones, uncapped but still small for the no-credit
        // Recruiter case) so no pagination needed here, unlike Admin's user list
        const entries = await ReferralLog.find({ referrer: id })
            .select('referredUserName referredUserEmail bonusCredits createdAt')
            .sort({ createdAt: -1 })

        const now = new Date()
        const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const startOfWeek = startOfDay(new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000))
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)

        // custom range sir — ?from=YYYY-MM-DD&to=YYYY-MM-DD, both optional and independent
        const customFrom = req.query.from ? new Date(req.query.from) : null
        const customTo = req.query.to ? new Date(req.query.to) : null

        const sumSince = (since) =>
            entries
                .filter((e) => e.createdAt >= since)
                .reduce((acc, e) => ({ invites: acc.invites + 1, credits: acc.credits + e.bonusCredits }), { invites: 0, credits: 0 })

        const totals = {
            week: sumSince(startOfWeek),
            month: sumSince(startOfMonth),
            year: sumSince(startOfYear),
            allTime: entries.reduce((acc, e) => ({ invites: acc.invites + 1, credits: acc.credits + e.bonusCredits }), { invites: 0, credits: 0 }),
        }

        // custom range is a filter-then-sum sir, not a "since" — both bounds (or just one) can
        // be given, so it isn't reusable via the sumSince helper above
        if (customFrom || customTo) {
            const inRange = entries.filter((e) =>
                (!customFrom || e.createdAt >= customFrom) && (!customTo || e.createdAt <= customTo)
            )
            totals.custom = inRange.reduce((acc, e) => ({ invites: acc.invites + 1, credits: acc.credits + e.bonusCredits }), { invites: 0, credits: 0 })
        }

        return res.status(200).json({
            success: true,
            entries,
            totals,
        })
    } catch (error) {
        (req.log || logger).error('get referral history failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your referral history',
        })
    }
}
