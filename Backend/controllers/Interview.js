const mongoose = require('mongoose')

const JobApplication = require('../Models/JobApplication')
const TestAttempt = require('../Models/TestAttempt')
const Test = require('../Models/Test')
const InterviewSchedule = require('../Models/InterviewSchedule')
const logger = require('../utils/logger')
const mailSender = require('../utils/Nodemailer')
const { notify } = require('../utils/NotificationLog')
const { buildInterviewIcs } = require('../utils/icsGenerator')
const { interviewProposedTemplate } = require('../Templates/InterviewProposed')
const { interviewConfirmedTemplate } = require('../Templates/InterviewConfirmed')
const { interviewCancelledTemplate } = require('../Templates/InterviewCancelled')

// how long a candidate has to confirm one of the proposed slots sir, before the proposal is
// considered stale and the recruiter needs to propose again (see InterviewScheduleExpiryCron.js).
// Deliberately longer than TestInviteExpiryCron's 5-hour window: a test invite is something a
// candidate can act on the moment they see it, but picking an interview slot may genuinely
// depend on checking their own calendar/other commitments first.
const PROPOSAL_WINDOW_MS = 48 * 60 * 60 * 1000

const frontendOrigin = () => process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/+$/, '')
    : 'http://localhost:5173'

const formatSlotLabel = (start, end) => {
    const dateLabel = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
    const startLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    const endLabel = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    return `${dateLabel}, ${startLabel} – ${endLabel} UTC`
}

// POST /job-applications/:applicationId/schedule-interview sir — recruiter proposes 2-4 slots.
// Only reachable once the candidate has completed the job's test AND (if the recruiter set one)
// cleared the job's own interviewEligibilityMinScore threshold — see Models/Job.js's own comment
// on that field for why it's a percentage computed here rather than a stored value.
exports.scheduleInterview = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { applicationId } = req.params
        const { slots, meetingLink, notes } = req.body

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({ success: false, message: 'Invalid application id' })
        }

        const application = await JobApplication.findById(applicationId)
            .populate('job')
            .populate('candidate', 'firstName lastName email')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this application',
            })
        }

        if (application.status !== 'completed_test') {
            return res.status(400).json({
                success: false,
                message: 'This candidate has not completed the test yet',
            })
        }

        // percentage gate sir — see Models/Job.js's interviewEligibilityMinScore comment.
        // Unset threshold means no gate at all, any completed_test applicant is eligible.
        if (application.job.interviewEligibilityMinScore !== undefined && application.job.interviewEligibilityMinScore !== null) {
            if (!application.testAttempt) {
                return res.status(400).json({
                    success: false,
                    message: 'No test attempt is linked to this application yet',
                })
            }
            const attempt = await TestAttempt.findById(application.testAttempt).select('score')
            const test = await Test.findById(application.job.test).select('totalMarks')
            const percentage = test?.totalMarks ? (attempt?.score || 0) / test.totalMarks * 100 : 0
            if (percentage < application.job.interviewEligibilityMinScore) {
                return res.status(400).json({
                    success: false,
                    message: `This candidate scored ${percentage.toFixed(0)}%, below this job's ${application.job.interviewEligibilityMinScore}% interview threshold`,
                })
            }
        }

        // one ACTIVE proposal per application at a time sir — re-proposing while one is still
        // 'proposed' would leave the candidate with two live emails pointing at two different
        // slot sets for the same interview. A cancelled/expired one doesn't block a fresh one.
        const existingActive = await InterviewSchedule.findOne({ application: application._id, status: 'proposed' })
        if (existingActive) {
            return res.status(400).json({
                success: false,
                message: 'An interview proposal is already pending for this candidate — cancel it before proposing a new one',
            })
        }

        const schedule = await InterviewSchedule.create({
            job: application.job._id,
            application: application._id,
            recruiter: recruiterId,
            candidate: application.candidate._id,
            proposedSlots: slots,
            meetingLink,
            notes,
            proposalExpiresAt: new Date(Date.now() + PROPOSAL_WINDOW_MS),
        })

        // best-effort sir — same pattern as every other non-critical mail send in this feature
        // area (test invites, hire/reject outcomes): a relay hiccup must never fail the
        // recruiter's action itself, the proposal is already saved regardless.
        try {
            if (application.candidate?.email) {
                const confirmUrl = `${frontendOrigin()}/Dashboard/Interviews?scheduleId=${schedule._id}`
                await mailSender(
                    application.candidate.email,
                    `Interview invitation — ${application.job.title} at ${application.job.companyName}`,
                    interviewProposedTemplate(
                        application.candidate.firstName,
                        application.job.title,
                        application.job.companyName,
                        slots.map((slot) => formatSlotLabel(new Date(slot.start), new Date(slot.end))),
                        confirmUrl
                    )
                )
            }
        } catch (mailError) {
            (req.log || logger).error('interview proposed mail failed', { err: mailError, applicationId })
        }

        notify({
            user: application.candidate._id,
            type: 'interview-scheduled',
            title: 'Interview invitation',
            message: `${application.job.companyName} proposed interview times for ${application.job.title}`,
            link: '/Dashboard/Interviews',
        })

        return res.status(201).json({
            success: true,
            message: 'Interview slots proposed to the candidate',
            schedule,
        })
    } catch (error) {
        (req.log || logger).error('schedule interview failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while proposing interview slots',
        })
    }
}

// POST /interviews/:scheduleId/confirm sir — candidate picks ONE of the recruiter's proposed
// slots by index. Deliberately never accepts an arbitrary start/end from the candidate — see
// Models/InterviewSchedule.js's own comment on proposedSlots for why.
exports.confirmSlot = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const { scheduleId } = req.params
        const { slotIndex } = req.body

        if (!mongoose.isValidObjectId(scheduleId)) {
            return res.status(400).json({ success: false, message: 'Invalid interview id' })
        }

        const schedule = await InterviewSchedule.findById(scheduleId)
            .populate('job', 'title companyName')
            .populate('candidate', 'firstName lastName email')
            .populate('recruiter', 'firstName lastName email')
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Interview not found' })
        }

        if (!schedule.candidate._id.equals(candidateId)) {
            return res.status(403).json({ success: false, message: 'You do not have access to this interview' })
        }

        if (schedule.status !== 'proposed') {
            return res.status(400).json({
                success: false,
                message: schedule.status === 'confirmed'
                    ? 'This interview is already confirmed'
                    : 'This proposal is no longer active — ask the recruiter to propose a new one',
            })
        }

        if (schedule.proposalExpiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'This proposal has expired — ask the recruiter to propose a new one' })
        }

        const slot = schedule.proposedSlots[slotIndex]
        if (!slot) {
            return res.status(400).json({ success: false, message: 'That slot no longer exists' })
        }

        schedule.status = 'confirmed'
        schedule.confirmedSlot = slot
        await schedule.save()

        const whenLabel = formatSlotLabel(slot.start, slot.end)

        // best-effort sir — the confirmation is already saved regardless of whether either
        // email actually lands. Attaches the SAME .ics to both sides so both calendars show the
        // identical event.
        try {
            const ics = buildInterviewIcs({
                title: `Interview: ${schedule.job.title} at ${schedule.job.companyName}`,
                description: schedule.notes || undefined,
                location: schedule.meetingLink || undefined,
                start: slot.start,
                end: slot.end,
                organizerEmail: schedule.recruiter?.email,
                attendeeEmail: schedule.candidate?.email,
            })
            const attachments = [{ filename: 'interview.ics', content: ics, contentType: 'text/calendar' }]

            if (schedule.candidate?.email) {
                await mailSender(
                    schedule.candidate.email,
                    `Interview confirmed — ${schedule.job.title}`,
                    interviewConfirmedTemplate(schedule.candidate.firstName, schedule.job.title, schedule.job.companyName, whenLabel, schedule.meetingLink, false),
                    attachments
                )
            }
            if (schedule.recruiter?.email) {
                await mailSender(
                    schedule.recruiter.email,
                    `Interview confirmed — ${schedule.job.title}`,
                    interviewConfirmedTemplate(schedule.recruiter.firstName, schedule.job.title, schedule.job.companyName, whenLabel, schedule.meetingLink, true, `${schedule.candidate.firstName} ${schedule.candidate.lastName}`),
                    attachments
                )
            }
        } catch (mailError) {
            (req.log || logger).error('interview confirmed mail failed', { err: mailError, scheduleId })
        }

        notify({
            user: schedule.recruiter._id,
            type: 'interview-scheduled',
            title: 'Interview confirmed',
            message: `${schedule.candidate.firstName} ${schedule.candidate.lastName} confirmed ${whenLabel}`,
            link: `/Recruiter/Jobs/${schedule.job._id}/applicants`,
        })

        return res.status(200).json({ success: true, message: 'Interview confirmed', schedule })
    } catch (error) {
        (req.log || logger).error('confirm interview slot failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while confirming the interview',
        })
    }
}

// PATCH /interviews/:scheduleId/cancel sir — either the recruiter or the candidate can cancel,
// at any pre-cancelled status (proposed OR confirmed) — a confirmed interview can still fall
// through and either side needs a way to call it off.
exports.cancelInterview = async (req, res) => {
    try {
        const userId = req?.User.id
        const { scheduleId } = req.params
        const { reason } = req.body

        if (!mongoose.isValidObjectId(scheduleId)) {
            return res.status(400).json({ success: false, message: 'Invalid interview id' })
        }

        const schedule = await InterviewSchedule.findById(scheduleId)
            .populate('job', 'title companyName')
            .populate('candidate', 'firstName lastName email')
            .populate('recruiter', 'firstName lastName email')
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Interview not found' })
        }

        const isRecruiter = schedule.recruiter._id.equals(userId)
        const isCandidate = schedule.candidate._id.equals(userId)
        if (!isRecruiter && !isCandidate) {
            return res.status(403).json({ success: false, message: 'You do not have access to this interview' })
        }

        if (!['proposed', 'confirmed'].includes(schedule.status)) {
            return res.status(400).json({ success: false, message: 'This interview cannot be cancelled from its current status' })
        }

        schedule.status = 'cancelled'
        schedule.cancelledBy = isRecruiter ? 'recruiter' : 'candidate'
        schedule.cancelReason = reason
        await schedule.save()

        // notify whichever side did NOT cancel sir
        const recipient = isRecruiter ? schedule.candidate : schedule.recruiter
        const cancelledByLabel = isRecruiter ? 'recruiter' : 'candidate'

        try {
            if (recipient?.email) {
                await mailSender(
                    recipient.email,
                    `Interview cancelled — ${schedule.job.title}`,
                    interviewCancelledTemplate(recipient.firstName, schedule.job.title, schedule.job.companyName, cancelledByLabel, reason)
                )
            }
        } catch (mailError) {
            (req.log || logger).error('interview cancelled mail failed', { err: mailError, scheduleId })
        }

        notify({
            user: recipient._id,
            type: 'interview-scheduled',
            title: 'Interview cancelled',
            message: `The interview for ${schedule.job.title} was cancelled`,
            link: isRecruiter ? '/Dashboard/Interviews' : `/Recruiter/Jobs/${schedule.job._id}/applicants`,
        })

        return res.status(200).json({ success: true, message: 'Interview cancelled', schedule })
    } catch (error) {
        (req.log || logger).error('cancel interview failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while cancelling the interview',
        })
    }
}

// GET /interviews/mine sir — the candidate's own "My Interviews" dashboard list
exports.listMyInterviews = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const schedules = await InterviewSchedule.find({ candidate: candidateId })
            .populate('job', 'title companyName')
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, schedules })
    } catch (error) {
        (req.log || logger).error('list my interviews failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading your interviews',
        })
    }
}

// GET /job-applications/:applicationId/interview sir — the recruiter's applicant-list view asks
// this for "does this application already have an interview thread, and what's its state"
exports.getInterviewForApplication = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { applicationId } = req.params

        if (!mongoose.isValidObjectId(applicationId)) {
            return res.status(400).json({ success: false, message: 'Invalid application id' })
        }

        const application = await JobApplication.findById(applicationId).populate('job', 'recruiter')
        if (!application || !application.job) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }
        if (!application.job.recruiter.equals(recruiterId)) {
            return res.status(403).json({ success: false, message: 'You do not have access to this application' })
        }

        // most recent thread sir — a cancelled/expired one can be followed by a fresh proposal,
        // the recruiter's UI only needs to know about the latest
        const schedule = await InterviewSchedule.findOne({ application: applicationId }).sort({ createdAt: -1 })

        return res.status(200).json({ success: true, schedule: schedule || null })
    } catch (error) {
        (req.log || logger).error('get interview for application failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while loading the interview',
        })
    }
}
