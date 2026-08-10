const mongoose = require('mongoose')

// a recruiter-owned proctored test sir — questions live as an embedded subdocument
// array, same shape as MockInterview.js's `turns`
const testSchema = new mongoose.Schema(
    {
        recruiter: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // every test now belongs to exactly one job posting sir — standalone tests are no
        // longer created; a test is always reached FROM a Job (see controllers/Job.js)
        job: {
            type: mongoose.Schema.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        questions: [
            {
                prompt: { type: String, required: true, trim: true, maxlength: 2000 },
                type: { type: String, enum: ['mcq', 'text'], required: true },
                // mcq only sir — ignored for 'text' questions
                options: [{ type: String, trim: true, maxlength: 300 }],
                // mcq only sir — used for auto-grading, absent means manual review
                correctAnswer: { type: String, trim: true },
                // how many of the test's totalMarks this question is worth sir — publishTest
                // rejects the test unless every question's marks sum to exactly totalMarks
                marks: { type: Number, required: true, min: 1, max: 1000 },
            },
        ],
        // the fixed score the recruiter is grading out of sir (e.g. 100 or 200) — question
        // marks must sum to this exactly before the test can be published, see publishTest
        totalMarks: {
            type: Number,
            required: true,
            min: 1,
        },
        timeLimitMinutes: {
            type: Number,
            required: true,
            min: 1,
            max: 180,
        },
        // warnings shown before the test is auto-terminated sir — the (maxViolations + 1)th
        // violation ends the attempt, see TestAttempt.js
        maxViolations: {
            type: Number,
            default: 4,
            min: 1,
            max: 20,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'closed'],
            default: 'draft',
            index: true,
        },
        // short shareable code a candidate uses to start an attempt sir — only set once
        // published (see publishTest in controllers/Test.js)
        inviteCode: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Test', testSchema)
