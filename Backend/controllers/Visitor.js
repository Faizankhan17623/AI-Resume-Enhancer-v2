const crypto = require('crypto')

const VisitorLog = require('../Models/VisitorLog')

const COOKIE_NAME = 'visitor_id'
const COOKIE_MAX_AGE = 5 * 365 * 24 * 60 * 60 * 1000 // 5 years sir — this cookie just needs to outlive "returning visitor"

// POST /track-visit — PUBLIC sir, no auth. The frontend fires this once per browser (checked via
// its own cookie before calling) so a returning visitor never creates a second VisitorLog row.
// Idempotent even if the frontend calls it twice sir — same cookieId just no-ops on the unique index.
exports.trackVisit = async (req, res) => {
    try {
        let cookieId = req.cookies?.[COOKIE_NAME]
        let isNew = false

        if (!cookieId) {
            cookieId = crypto.randomBytes(16).toString('hex')
            isNew = true
            res.cookie(COOKIE_NAME, cookieId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: COOKIE_MAX_AGE,
                path: '/',
            })
        }

        if (isNew) {
            // ignore a duplicate-key race sir — two tabs opened at once could both mint a fresh
            // cookieId before either Set-Cookie lands, the unique index just eats the second insert
            await VisitorLog.create({
                cookieId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            }).catch((err) => {
                if (err.code !== 11000) console.log('visitor log failed:', err.message)
            })
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while tracking the visit',
        })
    }
}
