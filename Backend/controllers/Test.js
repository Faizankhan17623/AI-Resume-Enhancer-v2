const mongoose = require('mongoose')
const crypto = require('crypto')
const cloudinary = require('cloudinary').v2

const Test = require('../Models/Test')
const TestAttempt = require('../Models/TestAttempt')
const Job = require('../Models/Job')
const JobApplication = require('../Models/JobApplication')
const logger = require('../utils/logger')

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024 // 2MB sir — a webcam frame, not a photo upload
const ALLOWED_SNAPSHOT_MIMES = ['image/jpeg', 'image/png', 'image/webp']

// ---------------------------------------------------------------------------
// recruiter-side sir
// ---------------------------------------------------------------------------

// POST /tests — create a draft test sir, attached to one of the recruiter's OWN jobs, questions
// can be added/edited until published. A job can only ever have one test (see the duplicate
// check below), matching the plan's "test lives inside a job" shape.
exports.createTest = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { job: jobId, title, description, questions, totalMarks, timeLimitMinutes, maxViolations } = req.body

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId })
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        if (job.test) {
            return res.status(400).json({
                success: false,
                message: 'This job already has a test attached',
            })
        }

        const test = await Test.create({
            recruiter: recruiterId,
            job: jobId,
            title,
            description,
            questions,
            totalMarks,
            timeLimitMinutes,
            ...(maxViolations !== undefined ? { maxViolations } : {}),
        })

        job.test = test._id
        await job.save()

        return res.status(201).json({
            success: true,
            message: 'Test created',
            test,
        })
    } catch (error) {
        (req.log || logger).error('create test failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the test',
        })
    }
}

// GET /tests — recruiter's own tests sir
exports.listMyTests = async (req, res) => {
    try {
        const recruiterId = req?.User.id

        const tests = await Test.find({ recruiter: recruiterId })
            .select('title status timeLimitMinutes maxViolations inviteCode createdAt updatedAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            tests,
        })
    } catch (error) {
        (req.log || logger).error('list tests failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your tests',
        })
    }
}

// GET /tests/:testId sir — full definition, including correctAnswer (recruiter only ever sees their own)
exports.getTest = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { testId } = req.params

        if (!mongoose.isValidObjectId(testId)) {
            return res.status(400).json({ success: false, message: 'Invalid test id' })
        }

        const test = await Test.findOne({ _id: testId, recruiter: recruiterId })
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' })
        }

        return res.status(200).json({ success: true, test })
    } catch (error) {
        (req.log || logger).error('get test failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the test',
        })
    }
}

// PATCH /tests/:testId sir — only while still a draft, matches how MockInterview/BuiltResume
// lock down editing once a flow is "live" elsewhere
exports.updateTest = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { testId } = req.params

        if (!mongoose.isValidObjectId(testId)) {
            return res.status(400).json({ success: false, message: 'Invalid test id' })
        }

        const test = await Test.findOne({ _id: testId, recruiter: recruiterId })
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' })
        }

        if (test.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Only a draft test can be edited — close it and create a new one instead',
            })
        }

        const { title, description, questions, totalMarks, timeLimitMinutes, maxViolations } = req.body
        if (title !== undefined) test.title = title
        if (description !== undefined) test.description = description
        if (questions !== undefined) test.questions = questions
        if (totalMarks !== undefined) test.totalMarks = totalMarks
        if (timeLimitMinutes !== undefined) test.timeLimitMinutes = timeLimitMinutes
        if (maxViolations !== undefined) test.maxViolations = maxViolations

        // the schema-level refine (Validation/schemas.js) only catches a mismatch when BOTH
        // questions and totalMarks are present in the SAME patch — a patch that only touches
        // one of them can't be checked there. Re-verify against the document's final state
        // here as the real, unconditional gate, same as publishTest's own check below.
        const marksSum = test.questions.reduce((sum, q) => sum + q.marks, 0)
        if (marksSum !== test.totalMarks) {
            return res.status(400).json({
                success: false,
                message: `Question marks must add up to exactly the total marks (currently ${marksSum} of ${test.totalMarks})`,
            })
        }

        await test.save()

        return res.status(200).json({ success: true, message: 'Test updated', test })
    } catch (error) {
        (req.log || logger).error('update test failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the test',
        })
    }
}

// POST /tests/:testId/publish sir — mints the invite code, candidates can only start an
// attempt once a test is published
exports.publishTest = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { testId } = req.params

        if (!mongoose.isValidObjectId(testId)) {
            return res.status(400).json({ success: false, message: 'Invalid test id' })
        }

        const test = await Test.findOne({ _id: testId, recruiter: recruiterId })
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' })
        }

        if (!test.questions.length) {
            return res.status(400).json({
                success: false,
                message: 'Add at least one question before publishing',
            })
        }

        // the hard gate sir — question marks must sum to EXACTLY totalMarks. The schema-level
        // refine (Validation/schemas.js) only catches this on a create/update call that
        // happens to carry both fields together; this is the one check that's never skippable.
        const marksSum = test.questions.reduce((sum, q) => sum + q.marks, 0)
        if (marksSum !== test.totalMarks) {
            return res.status(400).json({
                success: false,
                message: `Question marks add up to ${marksSum}, but the test is set to ${test.totalMarks} total marks — fix the question marks or the total before publishing`,
            })
        }

        if (test.status === 'draft') {
            test.inviteCode = crypto.randomBytes(6).toString('hex')
            test.status = 'published'
            await test.save()
        }

        return res.status(200).json({
            success: true,
            message: 'Test published',
            inviteCode: test.inviteCode,
            test,
        })
    } catch (error) {
        (req.log || logger).error('publish test failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while publishing the test',
        })
    }
}

// GET /tests/:testId/attempts sir — candidates who've taken this test, for the recruiter's dashboard
exports.getTestAttempts = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { testId } = req.params

        if (!mongoose.isValidObjectId(testId)) {
            return res.status(400).json({ success: false, message: 'Invalid test id' })
        }

        const test = await Test.findOne({ _id: testId, recruiter: recruiterId }).select('_id')
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' })
        }

        const attempts = await TestAttempt.find({ test: testId })
            .populate('candidate', 'firstName lastName email')
            .select('candidate status violationCount score startedAt submittedAt createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, attempts })
    } catch (error) {
        (req.log || logger).error('get test attempts failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the attempts',
        })
    }
}

// GET /test-attempts/:attemptId sir — full violation timeline + answers, recruiter only,
// and only for a test THEY own (ownership checked via the populated test's recruiter field)
exports.getAttemptDetail = async (req, res) => {
    try {
        const recruiterId = req?.User.id
        const { attemptId } = req.params

        if (!mongoose.isValidObjectId(attemptId)) {
            return res.status(400).json({ success: false, message: 'Invalid attempt id' })
        }

        const attempt = await TestAttempt.findById(attemptId)
            .populate('test')
            .populate('candidate', 'firstName lastName email')

        if (!attempt || !attempt.test) {
            return res.status(404).json({ success: false, message: 'Attempt not found' })
        }

        if (!attempt.test.recruiter.equals(recruiterId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this attempt',
            })
        }

        return res.status(200).json({ success: true, attempt })
    } catch (error) {
        (req.log || logger).error('get attempt detail failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the attempt',
        })
    }
}

// ---------------------------------------------------------------------------
// candidate-side sir — plain 'User' accounts, gated with isUser same as every other
// product feature (see Middlewares/Auth.js)
// ---------------------------------------------------------------------------

// POST /test-attempts/start/:inviteCode sir — creates the attempt and computes the
// server-side deadline (endsAt) that the countdown timer and the submit-timeout check below
// both trust over anything the client reports
exports.startAttempt = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const { inviteCode } = req.params

        const test = await Test.findOne({ inviteCode, status: 'published' })
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'This test link is invalid or no longer active',
            })
        }

        // apply-then-invite gate sir — a candidate can only start THIS job's test once the
        // recruiter has explicitly invited them (JobApplication.status === 'invited_to_test',
        // set by controllers/Job.js's inviteApplicantToTest). Having a valid invite code alone
        // is no longer enough; it identifies the test, this identifies who's allowed to take it.
        const application = await JobApplication.findOne({ job: test.job, candidate: candidateId })
        if (!application || !['invited_to_test', 'completed_test'].includes(application.status)) {
            return res.status(403).json({
                success: false,
                message: 'You need to be invited by the recruiter to take this test — apply to the job first',
            })
        }

        const testPayload = {
            title: test.title,
            description: test.description,
            questions: sanitizeQuestions(test.questions),
            totalMarks: test.totalMarks,
            maxViolations: test.maxViolations,
        }

        // resume an existing in-progress attempt sir rather than letting a refresh start a
        // second clock — same "one active session" shape as MockInterview's status check
        const existing = await TestAttempt.findOne({ test: test._id, candidate: candidateId, status: 'in-progress' })
        if (existing) {
            return res.status(200).json({
                success: true,
                message: 'Resuming your in-progress attempt',
                attempt: existing,
                test: testPayload,
            })
        }

        const alreadyDone = await TestAttempt.findOne({ test: test._id, candidate: candidateId, status: { $ne: 'in-progress' } })
        if (alreadyDone) {
            return res.status(400).json({
                success: false,
                message: 'You have already completed this test',
            })
        }

        const startedAt = new Date()
        const endsAt = new Date(startedAt.getTime() + test.timeLimitMinutes * 60 * 1000)

        let attempt
        try {
            attempt = await TestAttempt.create({
                test: test._id,
                candidate: candidateId,
                startedAt,
                endsAt,
            })
        } catch (createErr) {
            // race-proof backstop sir — the unique {test,candidate} index (Models/TestAttempt.js)
            // catches the narrow window between the two findOne checks above and this create()
            // call, where two near-simultaneous requests could otherwise both pass the checks
            // and both try to create an attempt
            if (createErr.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already completed this test',
                })
            }
            throw createErr
        }

        // links this attempt back to the application sir, so the recruiter's applicants list
        // (controllers/Job.js's getJobApplicants) can show attempt status/score/violations
        application.testAttempt = attempt._id
        await application.save()

        return res.status(201).json({
            success: true,
            message: 'Test started',
            attempt,
            test: testPayload,
        })
    } catch (error) {
        (req.log || logger).error('start attempt failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while starting the test',
        })
    }
}

// never send correctAnswer to the candidate sir — marks DOES go through, so the candidate can
// see how much each question is worth while taking the test
const sanitizeQuestions = (questions) =>
    questions.map((q) => ({ _id: q._id, prompt: q.prompt, type: q.type, options: q.options, marks: q.marks }))

// auto-grades the mcq questions sir, summing MARKS earned rather than counting correct
// answers — matches the recruiter's own totalMarks scale (e.g. 68 out of a 100-mark test)
// instead of a 0-100 percentage. Text questions are still left for the recruiter to read
// manually, same limitation as before.
const scoreAnswers = (questions, answers) => {
    const byId = new Map(answers.map((a) => [String(a.questionId), a.answer]))
    let earned = 0
    let gradable = 0
    for (const q of questions) {
        if (q.type !== 'mcq' || !q.correctAnswer) continue
        gradable += 1
        if (byId.get(String(q._id)) === q.correctAnswer) earned += q.marks
    }
    return gradable ? earned : null
}

// POST /test-attempts/:attemptId/answers sir — normal completion path
exports.submitAnswers = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const { attemptId } = req.params
        const { answers } = req.body

        if (!mongoose.isValidObjectId(attemptId)) {
            return res.status(400).json({ success: false, message: 'Invalid attempt id' })
        }

        const attempt = await TestAttempt.findOne({ _id: attemptId, candidate: candidateId }).populate('test')
        if (!attempt) {
            return res.status(404).json({ success: false, message: 'Attempt not found' })
        }

        if (attempt.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: 'This test attempt has already ended',
            })
        }

        // server is the source of truth on time sir, never the client's own countdown —
        // a late submit still lands here as a timeout rather than a completion
        const timedOut = Date.now() > attempt.endsAt.getTime()

        attempt.answers = answers || []
        attempt.status = timedOut ? 'terminated_timeout' : 'completed'
        attempt.submittedAt = new Date()
        attempt.score = scoreAnswers(attempt.test.questions, attempt.answers)
        await attempt.save()

        // the applicant's status now reflects "done with the test step" sir, regardless of
        // WHICH terminal state ended it — the recruiter cares that it's finished and reviewable,
        // the specific reason (timeout vs clean submit vs violations) is on the attempt itself
        await JobApplication.updateOne(
            { job: attempt.test.job, candidate: candidateId, testAttempt: attempt._id },
            { status: 'completed_test' }
        )

        return res.status(200).json({
            success: true,
            message: timedOut ? 'Time was up — your answers were auto-submitted' : 'Test submitted',
            status: attempt.status,
            score: attempt.score,
        })
    } catch (error) {
        (req.log || logger).error('submit answers failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while submitting the test',
        })
    }
}

// POST /test-attempts/:attemptId/violations sir — multipart, field name 'snapshot'.
// Uploads the webcam frame to Cloudinary and atomically appends the violation event. If the
// running count reaches (test.maxViolations + 1) the attempt is terminated in the SAME update,
// closing the race a second concurrent violation request could otherwise hit.
exports.logViolation = async (req, res) => {
    try {
        const candidateId = req?.User.id
        const { attemptId } = req.params

        if (!mongoose.isValidObjectId(attemptId)) {
            return res.status(400).json({ success: false, message: 'Invalid attempt id' })
        }

        const snapshot = req.files?.snapshot
        if (!snapshot) {
            return res.status(400).json({ success: false, message: 'A snapshot image is required' })
        }
        if (!ALLOWED_SNAPSHOT_MIMES.includes(snapshot.mimetype)) {
            return res.status(400).json({ success: false, message: 'Snapshot must be a JPG, PNG, or WEBP image' })
        }
        if (snapshot.size > MAX_SNAPSHOT_BYTES) {
            return res.status(400).json({ success: false, message: 'Snapshot must be under 2MB' })
        }

        const attempt = await TestAttempt.findOne({ _id: attemptId, candidate: candidateId }).populate('test')
        if (!attempt) {
            return res.status(404).json({ success: false, message: 'Attempt not found' })
        }

        if (attempt.status !== 'in-progress') {
            return res.status(400).json({ success: false, message: 'This test attempt has already ended' })
        }

        const upload = await cloudinary.uploader.upload(
            `data:${snapshot.mimetype};base64,${snapshot.data.toString('base64')}`,
            {
                folder: 'test-violations',
                public_id: `${attemptId}-${Date.now()}`,
            }
        )

        const maxViolations = attempt.test.maxViolations || 4
        const terminatesAt = maxViolations + 1

        // atomic sir — $push the event and $inc the counter in one write, then decide the
        // resulting status from the document AS UPDATED, not from a stale in-memory count
        const updated = await TestAttempt.findOneAndUpdate(
            { _id: attemptId, candidate: candidateId, status: 'in-progress' },
            {
                $push: { violations: { type: 'look-away', snapshotUrl: upload.secure_url } },
                $inc: { violationCount: 1 },
            },
            { new: true }
        )

        if (!updated) {
            return res.status(400).json({ success: false, message: 'This test attempt has already ended' })
        }

        let finalStatus = updated.status
        if (updated.violationCount >= terminatesAt && updated.status === 'in-progress') {
            updated.status = 'terminated_violations'
            updated.submittedAt = new Date()
            await updated.save()
            finalStatus = updated.status

            // the frontend's own follow-up submitAnswers call (see ProctoredTestRunner.jsx's
            // endTest) will find attempt.status already non-'in-progress' by the time it lands
            // and 400 out before reaching ITS JobApplication update — so this is the only place
            // a violation-terminated attempt actually flips the applicant to 'completed_test'.
            await JobApplication.updateOne(
                { job: attempt.test.job, candidate: candidateId, testAttempt: attemptId },
                { status: 'completed_test' }
            )
        }

        return res.status(200).json({
            success: true,
            violationCount: updated.violationCount,
            maxViolations,
            status: finalStatus,
            terminated: finalStatus !== 'in-progress',
        })
    } catch (error) {
        (req.log || logger).error('log violation failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while recording the violation',
        })
    }
}
