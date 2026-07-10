const  cookie = require("cookie");
const bcrypt = require('bcrypt')
const  jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator')
const crypto = require('crypto')

const User = require('../Models/User');
const OTP = require('../Models/OTP.js')
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
            user: Creation,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create user',
        });
    }
};

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

        // compare the entered password with the stored hash sir
        const Comparing = await bcrypt.compare(password, existingUser.password)

        // not case sir — the password does not match the stored one
        if (!Comparing) {
            return res.status(401).json({
                success: false,
                field: 'password',
                message: 'Incorrect password, please try again',
            });
        }

        User.id =existingUser._id

        const {_id,firstName,lastName} = existingUser

        const JwtCreation = await jwt.sign({
            id: _id, firstName: firstName, lastName: lastName
        },process.env.JWT_PRIVATE_KEY,{  expiresIn: 7 * 24 * 60 * 60 * 1000 })

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

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            // token + basic profile in the body too sir — the frontend stores these in redux/localStorage
            token: JwtCreation,
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
        const otpBody = await OTP.create(otpPayload)

    res.status(200).json({
      success: true,
      message: `OTP Sent Successfully`,
      data:otpBody
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

        // findOne checker sir — is this number already taken (model field is `Number`)
        const existingNumber = await User.findOne({ Number: number });
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
    try {
        const { email } = req.body;
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
            { new: true }

            )

        // not case sir — no account is registered with this email
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email',
            });
        }


        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173/"
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
        console.log(error.message);
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
    
      const encryptedPassword = await bcrypt.hash(newPassword, 10)
    await User.findOneAndUpdate(
      { token: token },
      { password: encryptedPassword, token: null, resetPasswordExpires: null },
      { new: true }
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

        // store it as a dd mm yy string sir (padded so it always parses back cleanly)
        const dd = String(deletionDate.getDate()).padStart(2, '0');
        const mm = String(deletionDate.getMonth() + 1).padStart(2, '0');
        const yy = String(deletionDate.getFullYear()).slice(-2);
        const bufferTiming = `${dd} ${mm} ${yy}`;

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

        // parse the stored dd mm yy string back into a real date sir
        const [dd, mm, yy] = existingUser.BufferTiming.split(' ');
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
            .select('firstName lastName email number CountryCode role Verified Subscription SubType SubscriptionExpires count createdAt')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found, please log in again',
            });
        }

        // the effective plan sir — an expired Pro is a Basic again
        const { getEffectivePlan } = require('../utils/Plans')
        const plan = getEffectivePlan(user)

        // activity counts for the account page sir
        const Review = require('../Models/Review')
        const Chat = require('../Models/Chat')
        const [reviewCount, chatCount] = await Promise.all([
            Review.countDocuments({ user: id }),
            Chat.countDocuments({ user: id }),
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
