// Recruiter proctored test schemas sir — see Models/Test.js, Models/TestAttempt.js and
// controllers/Test.js.

const { z } = require('zod')
const { objectId } = require('./Shared')

const testQuestionSchema = z.object({
    prompt: z.string({ error: 'Question prompt is required' }).trim().min(1, 'Question prompt is required').max(2000),
    type: z.enum(['mcq', 'text'], { error: 'Question type must be mcq or text' }),
    options: z.array(z.string().trim().max(300)).max(10).optional(),
    correctAnswer: z.string().trim().max(300).optional(),
    marks: z.coerce.number({ error: 'Marks are required' }).int().min(1, 'Marks must be at least 1').max(1000),
}).refine(
    (q) => q.type !== 'mcq' || (q.options && q.options.length >= 2),
    { message: 'An mcq question needs at least 2 options', path: ['options'] }
)

// question marks must sum to EXACTLY totalMarks sir — this is the schema-level half of the
// check; publishTest in controllers/Test.js re-checks the same rule as the hard gate, since
// updateTestSchema's fields are all optional and a partial patch might not carry both
// questions and totalMarks together for this refine to catch
const marksSumToTotal = (data) => {
    if (!data.questions || data.totalMarks === undefined) return true
    return data.questions.reduce((sum, q) => sum + q.marks, 0) === data.totalMarks
}
const marksSumIssue = { message: 'Question marks must add up to exactly the total marks', path: ['totalMarks'] }

const createTestSchema = z.object({
    job: objectId,
    title: z.string({ error: 'Title is required' }).trim().min(1, 'Title is required').max(150),
    description: z.string().trim().max(2000).optional(),
    questions: z.array(testQuestionSchema, { error: 'At least one question is required' }).min(1, 'At least one question is required').max(100),
    totalMarks: z.coerce.number({ error: 'Total marks are required' }).int().min(1),
    timeLimitMinutes: z.coerce.number().int().min(1).max(180),
    maxViolations: z.coerce.number().int().min(1).max(20).optional(),
}).refine(marksSumToTotal, marksSumIssue)

// same shape as create sir, but every field optional — a recruiter can patch just the title.
// `job` is deliberately NOT patchable — a test's job is set once at creation and never moves.
const updateTestSchema = z.object({
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    questions: z.array(testQuestionSchema).min(1).max(100).optional(),
    totalMarks: z.coerce.number().int().min(1).optional(),
    timeLimitMinutes: z.coerce.number().int().min(1).max(180).optional(),
    maxViolations: z.coerce.number().int().min(1).max(20).optional(),
}).refine(marksSumToTotal, marksSumIssue)

const submitAnswersSchema = z.object({
    answers: z.array(
        z.object({
            questionId: objectId,
            answer: z.string().trim().max(5000).optional(),
        })
    ),
})

const inviteCodeParamSchema = z.object({ inviteCode: z.string().trim().min(1, 'Invite code is required') })

const testIdParamSchema = z.object({ testId: objectId })

const attemptIdParamSchema = z.object({ attemptId: objectId })

module.exports = {
    createTestSchema,
    updateTestSchema,
    submitAnswersSchema,
    inviteCodeParamSchema,
    testIdParamSchema,
    attemptIdParamSchema,
}
