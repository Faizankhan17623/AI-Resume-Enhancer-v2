const mongoose = require('mongoose')
const crypto = require('crypto')

const Job = require('../Models/Job')
const JobInvite = require('../Models/JobInvite')
const logger = require('../utils/logger')
const mailSender = require('../utils/Nodemailer')
const { jobInviteTemplate } = require('../Templates/JobInvite')

const INVITE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 days sir — a job invite is a bigger ask
// than a test invite (fill out a full application, not just start a test), longer window than
// TestInviteExpiryCron.js's 5 hours

const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

// POST /jobs/:jobId/invite sir — recruiter sends (or re-sends) a direct invite to one email.
// Upserts on (job, email) sir — re-inviting the same person refreshes the token/expiry rather
// than creating a duplicate row, so a recruiter can just click "invite" again if the first one
// expired or the email needs a resend.
exports.sendJobInvite = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params
        const { email } = req.body

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId, status: 'published' }).select('title companyName visibility')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Published job not found' })
        }
        if (job.visibility !== 'invite_only') {
            return res.status(400).json({
                success: false,
                message: 'This job is public — invites are only for invite-only jobs',
            })
        }

        const normalizedEmail = email.trim().toLowerCase()
        const token = crypto.randomBytes(24).toString('hex')

        const invite = await JobInvite.findOneAndUpdate(
            { job: jobId, email: normalizedEmail },
            {
                $set: {
                    recruiter: recruiterId,
                    token,
                    status: 'pending',
                    expiresAt: new Date(Date.now() + INVITE_WINDOW_MS),
                    application: null,
                },
            },
            { upsert: true, returnDocument: 'after' }
        )

        // best-effort sir — same pattern as every other non-critical mail send in this app;
        // the invite row is already saved regardless of whether the email lands.
        try {
            const inviteUrl = `${frontendOrigin()}/Jobs/invite/${token}`
            await mailSender(
                normalizedEmail,
                `You're invited to apply — ${job.title} at ${job.companyName}`,
                jobInviteTemplate(job.title, job.companyName, inviteUrl)
            )
        } catch (mailError) {
            (req.log || logger).error('job invite mail failed', { err: mailError, jobId, email: normalizedEmail })
        }

        return res.status(201).json({ success: true, message: `Invited ${normalizedEmail}`, invite })
    } catch (error) {
        (req.log || logger).error('send job invite failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending this invite',
        })
    }
}

// GET /jobs/:jobId/invites sir — the recruiter's own invite list for one job, so they can see
// who's been invited and whether they've applied yet
exports.listJobInvites = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { jobId } = req.params

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid job id' })
        }

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId }).select('_id')
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        const invites = await JobInvite.find({ job: jobId }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, invites })
    } catch (error) {
        (req.log || logger).error('list job invites failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading invites',
        })
    }
}

// GET /public/jobs/invite/:token sir — the candidate's landing page. Deliberately public (no
// Auth) so the link works the instant it's clicked, even before the candidate logs in — the
// job details render either way, applyToJob itself is what actually requires a login (and the
// matching invite) once they click apply.
exports.getJobInviteByToken = async (req, res) => {
    try {
        const { token } = req.params

        const invite = await JobInvite.findOne({ token }).populate('job', 'title companyName description location employmentType skills compensationType ctcMin ctcMax status')
        if (!invite || !invite.job) {
            return res.status(404).json({ success: false, message: 'This invite link is invalid' })
        }

        if (invite.status === 'applied') {
            return res.status(200).json({ success: true, job: invite.job, status: 'applied' })
        }
        if (invite.status === 'expired' || invite.expiresAt < new Date()) {
            return res.status(410).json({ success: false, message: 'This invite has expired — ask the recruiter to send a new one' })
        }
        if (invite.job.status !== 'published') {
            return res.status(410).json({ success: false, message: 'This job is no longer accepting applications' })
        }

        return res.status(200).json({ success: true, job: invite.job, status: 'pending', email: invite.email })
    } catch (error) {
        (req.log || logger).error('get job invite by token failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading this invite',
        })
    }
}
