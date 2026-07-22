const  cookie = require("cookie");
const bcrypt = require('bcrypt')
const  jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator')
const crypto = require('crypto')

const User = require('../Models/User');
const OTP = require('../Models/OTP.js')
const LoginLog = require('../Models/LoginLog.js')
const mailSender = require('../utils/Nodemailer.js')

const { deleteAccountEmail } = require('../Templates/DeleteAccount.js')
const {passwordResetTemplate} = require('../Templates/passwordResetTemplate.js')
// ============================================================
// CREATE USER (Register)
// ============================================================
exports.createUser = async (req, res) => {
    try {

        const { firstName, lastName, email, password, number ,Code,otp} = req.body ;

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

        const Creation = await User.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashing,
            confirmpassword: hashing,
            number: number,
            CountryCode: Code,
            Verified: false
        })

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            // never the raw doc sir — Creation carries the bcrypt password/confirmpassword hash,
            // and the frontend only needs to know it worked before redirecting to /Login
            user: {
                _id: Creation._id,
                firstName: Creation.firstName,
                lastName: Creation.lastName,
                email: Creation.email,
            },
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create user',
        });
    }
};

// account lockout policy sir — tune ONLY here
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

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

        // a Google account that has never set a local password sir — bcrypt.compare would
        // throw against an undefined hash, point them at the right sign-in method instead
        if (!existingUser.password) {
            return res.status(400).json({
                success: false,
                field: 'password',
                message: 'This account signs in with Google — use "Continue with Google" instead',
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

        User.id =existingUser._id

        const {_id,firstName,lastName} = existingUser

        const JwtCreation = await jwt.sign({
            id: _id, firstName: firstName, lastName: lastName
        },process.env.JWT_PRIVATE_KEY,{  expiresIn: 7 * 24 * 60 * 60 })

        const Updation = await User.findByIdAndUpdate(User.id,{token:JwtCreation,Verified:true})

        const SetCookie = cookie.stringifySetCookie({
            name: 'token',
            value: JwtCreation,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        })

        res.setHeader('Set-Cookie', SetCookie)

        // fire-and-forget sir — same pattern as logAi/logAction, a logging failure must never block a real login
        LoginLog.create({
            user: _id,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        }).catch((err) => console.log('login log failed:', err.message))

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            // token + basic profile in the body too sir — the frontend stores these in redux/localStorage
            token: JwtCreation,
            accountRecovered,
            user: {
                id: _id,
                firstName,
                lastName,
                email: existingUser.email,
                role: existingUser.role,
                SubType: existingUser.SubType,
            }
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to login',
        });
    }
};

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
        // email (Models/OTP.js's pre-save hook sends it); returning it here would let
        // anyone who can call this endpoint read the code straight from the Network tab
        // and skip email verification entirely
        res.status(200).json({
            success: true,
            message: `OTP Sent Successfully`,
        })

    } catch (error) {
        console.log(error.message);
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
        ).select('-password -confirmpassword');

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
        console.log(error.message);
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
        ).select('-password -confirmpassword');

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
        console.log(error.message);
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

        // OAuth accounts (Google etc) have no password to change sir — bcrypt.compare would
        // throw against an undefined hash, so refuse cleanly before it gets there
        if (existingUser.provider !== 'local') {
            return res.status(400).json({
                success: false,
                message: 'This account signs in with Google and has no password to change',
            });
        }

        // compare the old password with the stored hash sir
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

        // save the new hashed password to the db sir
        await User.findByIdAndUpdate(userId, {
            password: hashing,
            confirmpassword: hashing,
        });

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.log(error.message);
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
        ).select('-password -confirmpassword');

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
        console.log(error.message);
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
        ).select('-password -confirmpassword');

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
        console.log(error.message);
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
                token: token,
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

        await mailSender(
            email,
            "Reset Your  Password",
            passwordResetTemplate(`${user.firstName} ${user.lastName}`, url)
        )


        return res.status(200).json({
            success: true,
            message: 'Password reset email sent',
        });
    } catch (error) {
        console.log(`[forgotPassword] failed for email="${email}" at ${new Date().toISOString()}`)
        console.log(error);
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
      return res.json({
        success: false,
        message: "Password and Confirm Password Does not Match",
      })
    }
    const userDetails = await User.findOne({ token: token })
    if (!userDetails) {
      return res.json({
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

    // not case sir — new password can't be the same as the current one
    const SameAsOld = await bcrypt.compare(newPassword, userDetails.password)
    if (SameAsOld) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password',
      })
    }

      const encryptedPassword = await bcrypt.hash(newPassword, 10)
    await User.findOneAndUpdate(
      { token: token },
      { password: encryptedPassword, token: null, resetPasswordExpires: null },
      { returnDocument: 'after' }
    )
        return res.status(200).json({
            success: true,
            message: 'Password reset successfully',
        });
    } catch (error) {
        console.log(error.message);
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
            .select('-password -confirmpassword -token -resetPasswordToken -resetPasswordExpires')

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
        console.log(error.message)
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

        // suspend the account into the buffer instead of deleting it now sir
        await User.findByIdAndUpdate(userId, {
            Buffer: true,
            BufferTiming: bufferTiming,
        });

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
            console.log('Delete-account mail failed:', mailError.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Account scheduled for deletion. You have 2 days to recover it by logging back in.',
            deletionDate: bufferTiming,
        });
    } catch (error) {
        console.log(error.message);
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
        console.log(error.message);
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
            .select('firstName lastName email number CountryCode role Verified provider Subscription SubType SubscriptionExpires count createdAt notifyStreak notifyWinBack notifyDigest notifyHealthCheck onboardingCompleted')

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

        return res.status(200).json({
            success: true,
            user,
            plan: {
                key: plan.key,
                name: plan.name,
                creditsUsed: user.count,
                creditsLimit: plan.credits,          // null means unlimited sir
                maxMessagesPerChat: plan.maxMessagesPerChat,
                expiresAt: plan.key === 'Basic' ? null : user.SubscriptionExpires,
            },
            activity: {
                reviewCount,
                chatCount,
                resumeCount,
                coverLetterCount,
            }
        });
    } catch (error) {
        console.log(error.message);
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
        const { notifyStreak, notifyWinBack, notifyDigest, notifyHealthCheck } = req.body;

        // only touch the fields the caller actually sent sir, so a partial update never resets the others
        const updates = {};
        if (typeof notifyStreak === 'boolean') updates.notifyStreak = notifyStreak;
        if (typeof notifyWinBack === 'boolean') updates.notifyWinBack = notifyWinBack;
        if (typeof notifyDigest === 'boolean') updates.notifyDigest = notifyDigest;
        if (typeof notifyHealthCheck === 'boolean') updates.notifyHealthCheck = notifyHealthCheck;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one notification preference is required',
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })
            .select('notifyStreak notifyWinBack notifyDigest notifyHealthCheck');

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
        });
    } catch (error) {
        console.log(error.message);
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
        console.log(error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update onboarding status',
        });
    }
};
