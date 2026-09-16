const mongoose = require('mongoose')

const JobApplication = require('../Models/JobApplication')
const MessageThread = require('../Models/MessageThread')
const User = require('../Models/User')
const logger = require('../utils/logger')
const mailSender = require('../utils/Nodemailer')
const { notify } = require('../utils/NotificationLog')
const { newMessageTemplate } = require('../Templates/NewMessage')

const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

// a preview for the email sir — the message body itself is only shown in-app, the email
// just teases it and links back rather than reproducing the full text
const previewOf = (text) => text.length > 140 ? `${text.slice(0, 140)}…` : text

// finds (or creates) the thread for one application sir, and confirms the caller is
// actually one of its two parties — shared by every handler below so the access check
// can't drift between them
const getThreadForCaller = async (applicationId, userId) => {
    if (!mongoose.isValidObjectId(applicationId)) return { error: { status: 400, message: 'Invalid application id' } }

    const application = await JobApplication.findById(applicationId).populate('job', 'recruiter title companyName')
    if (!application || !application.job) return { error: { status: 404, message: 'Application not found' } }

    const isRecruiter = application.job.recruiter.equals(userId)
    const isCandidate = application.candidate.equals(userId)
    if (!isRecruiter && !isCandidate) return { error: { status: 403, message: 'You do not have access to this conversation' } }

    // thread only opens once there's a real relationship sir, same gate philosophy as
    // Interview Scheduling — 'applied' alone (before any recruiter action at all) is too
    // early for a message thread to make sense
    if (application.status === 'applied') {
        return { error: { status: 400, message: 'Messaging opens once the recruiter has acted on this application' } }
    }

    let thread = await MessageThread.findOne({ application: applicationId })
    if (!thread) {
        thread = await MessageThread.create({
            job: application.job._id,
            application: application._id,
            recruiter: application.job.recruiter,
            candidate: application.candidate,
        })
    }

    return { thread, application, isRecruiter }
}

// GET /job-applications/:applicationId/messages sir — either side fetches the thread,
// creating an empty one on first open. Also resets the CALLER's own unread count to 0.
exports.getThread = async (req, res) => {
    try {
        const userId = req?.User.id
        const { applicationId } = req.params

        const result = await getThreadForCaller(applicationId, userId)
        if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message })

        const { thread, isRecruiter } = result

        // mark read sir — only the caller's own side, never touches the other party's count
        if (isRecruiter && thread.recruiterUnreadCount > 0) {
            thread.recruiterUnreadCount = 0
            await thread.save()
        } else if (!isRecruiter && thread.candidateUnreadCount > 0) {
            thread.candidateUnreadCount = 0
            await thread.save()
        }

        return res.status(200).json({ success: true, thread })
    } catch (error) {
        (req.log || logger).error('get message thread failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading the conversation',
        })
    }
}

// POST /job-applications/:applicationId/messages sir — send one message, bumps the
// OTHER side's unread count, best-effort email/notification to them
exports.sendMessage = async (req, res) => {
    try {
        const userId = req?.User.id
        const { applicationId } = req.params
        const { text } = req.body

        const result = await getThreadForCaller(applicationId, userId)
        if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message })

        const { thread, application, isRecruiter } = result

        thread.messages.push({ sender: isRecruiter ? 'recruiter' : 'candidate', text })
        thread.lastMessageAt = new Date()
        if (isRecruiter) {
            thread.candidateUnreadCount += 1
        } else {
            thread.recruiterUnreadCount += 1
        }
        await thread.save()

        // best-effort sir — same pattern as every other non-critical mail send in this
        // app: the message is already saved regardless of whether the email lands.
        // Fetched directly by id rather than a nested populate('job.recruiter') sir —
        // `application.job` here is already a partially-populated object (only
        // recruiter/title/companyName selected in getThreadForCaller above), and a
        // second populate call against an already-populated path doesn't reliably
        // re-hydrate it.
        try {
            const recipientId = isRecruiter ? application.candidate : application.job.recruiter
            const recipient = await User.findById(recipientId).select('firstName lastName email')
            const dashboardLink = isRecruiter
                ? `${frontendOrigin()}/Dashboard/My-Applications`
                : `${frontendOrigin()}/Recruiter/Jobs/${application.job._id}/applicants`

            if (recipient?.email) {
                await mailSender(
                    recipient.email,
                    `New message — ${application.job.title}`,
                    newMessageTemplate(recipient.firstName, application.job.title, application.job.companyName, previewOf(text), dashboardLink)
                )
            }

            notify({
                user: recipient?._id,
                type: 'new-message',
                title: 'New message',
                message: previewOf(text),
                link: dashboardLink,
            })
        } catch (mailError) {
            (req.log || logger).error('new message mail failed', { err: mailError, applicationId })
        }

        return res.status(201).json({ success: true, message: 'Message sent', thread })
    } catch (error) {
        (req.log || logger).error('send message failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending the message',
        })
    }
}
