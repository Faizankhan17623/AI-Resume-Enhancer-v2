const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')
const Grok = require('groq-sdk')

const MockInterview = require('../Models/MockInterview')
const { consumeCredit, refundCredit, getUserPlan } = require('../utils/Plans')
const logger = require('../utils/logger')
const { buildMockInterviewStartPrompt, buildMockInterviewAnswerPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { updateStreak } = require('../utils/Streak')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { getModelForPlan } = require('../utils/AiModel')
const { isFeatureEnabled, getFeatureFlagDetails } = require('../utils/FeatureFlags')
const { validatePdfUpload } = require('../utils/pdfUpload')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })

// ProMax's own model sir — this feature is ProMax-only so there's no plan branching to do,
// unlike Chat.js/AI.js which pick the model per the caller's actual plan
const MODEL = getModelForPlan('ProMax')

// how many questions a session runs before it's marked completed sir
const MAX_TURNS = 6

const isJsonValidationFailure = (err) => err?.error?.error?.code === 'json_validate_failed'

// strips a <think> reasoning block and stray ```json fences, then JSON.parse — same
// hardening as AI.js's review parser, since the same model family can emit either
const parseJsonReply = (raw) => {
    if (!raw) return null
    if (raw.includes('</think>')) raw = raw.split('</think>').pop()
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
    try {
        return JSON.parse(raw)
    } catch (parseErr) {
        // truncated sir — raw can carry the user's own interview answers (PII), so only a short
        // preview goes to the log, enough to spot a malformed-JSON pattern.
        // bare logger, not req.log — this is a standalone helper with no request in scope.
        logger.error('mock interview JSON parse failed', { err: parseErr, rawPreview: raw?.slice(0, 200) })
        return null
    }
}

const callGroqJson = async (userId, type, messages) => {
    const t0 = Date.now()
    const run = async () => {
        try {
            const result = await grok.chat.completions.create({
                messages,
                model: MODEL,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: userId, type, plan: 'ProMax', model: MODEL, usage: result.usage, latencyMs: Date.now() - t0, success: true })
            return result
        } catch (aiErr) {
            logAi({ user: userId, type, plan: 'ProMax', model: MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }
    }

    try {
        return await run()
    } catch (aiErr) {
        if (!isJsonValidationFailure(aiErr)) throw aiErr
        return await run() // one retry only sir, same rule as AI.js
    }
}

// POST /mock-interview — start a new session sir, ProMax only, 1 credit per session (not per
// question — a multi-question flow shouldn't nickel-and-dime the way per-message chat would)
exports.startMockInterview = async (req, res) => {
    try {
        const id = req?.User.id

        if (!(await isFeatureEnabled('feature.mockInterview'))) {
            const details = await getFeatureFlagDetails('feature.mockInterview')
            return res.status(503).json({
                success: false,
                message: 'This feature is temporarily disabled',
                note: details.note,
                disabledUntil: details.disabledUntil,
            })
        }

        const plan = await getUserPlan(id)
        if (!plan || plan.key !== 'ProMax') {
            return res.status(403).json({
                success: false,
                message: 'Mock interviews are a Pro Max feature, please upgrade your plan',
            })
        }

        const PDf = req.files?.PDf
        const uploadError = validatePdfUpload(PDf)
        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError,
            })
        }

        const jd = req.body.jd
        if (!jd || !jd.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Job Description is required',
            })
        }

        // parse the upload BEFORE spending sir — a bad PDF used to cost a credit on the way to a 400
        const parser = new PDFParse({ data: PDf.data })
        const result = await parser.getText()
        if (!result?.text) {
            return res.status(400).json({
                success: false,
                message: 'error in getting the result from the pdf',
            })
        }

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({
                success: false,
                message: spend.message,
                ...(spend.code ? { code: spend.code } : {}),
            })
        }

        const resumeText = result.text
        const role = jd.trim().slice(0, 60) || 'Mock Interview'

        let Invoking
        try {
            Invoking = await callGroqJson(id, 'mockInterview', [
                { role: 'system', content: buildMockInterviewStartPrompt(resumeText, jd) },
                { role: 'user', content: 'Ask the first question. Return only the JSON.' },
            ])
        } catch (aiErr) {
            logger.error('mock interview start failed', { err: aiErr, userId: id })
            // the interview never started sir — give the credit back
            await refundCredit(id)
            return res.status(502).json({
                success: false,
                message: 'The AI is unavailable right now, please try again',
            })
        }

        const first = parseJsonReply(Invoking?.choices?.[0]?.message?.content)
        if (!first || !first.question) {
            await refundCredit(id)
            return res.status(502).json({
                success: false,
                message: 'The AI response was not in the expected format, please try again',
            })
        }

        const session = await MockInterview.create({
            user: id,
            role,
            resumeText,
            jd,
            turns: [{
                question: first.question,
                category: first.category,
                difficulty: first.difficulty,
            }],
        })

        recordFeatureUse(id)

        return res.status(201).json({
            success: true,
            message: 'Mock interview started',
            sessionId: session._id,
            role: session.role,
            turn: session.turns[0],
        })
    } catch (error) {
        (req.log || logger).error('start mock interview failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while starting the mock interview',
        })
    }
}

// POST /mock-interview/:sessionId/answer — body: { answer } sir, scores the current open
// question and returns the next one, or marks the session completed at MAX_TURNS
exports.answerMockInterview = async (req, res) => {
    try {
        const id = req?.User.id
        const { sessionId } = req.params
        const answer = req.body.answer

        if (!mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session id',
            })
        }

        if (!answer || !answer.trim()) {
            return res.status(400).json({
                success: false,
                message: 'An answer is required',
            })
        }

        const session = await MockInterview.findOne({ _id: sessionId, user: id })
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview session not found',
            })
        }

        if (session.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'This mock interview session is already completed',
            })
        }

        const currentTurn = session.turns[session.turns.length - 1]
        if (currentTurn.answer) {
            return res.status(400).json({
                success: false,
                message: 'The current question has already been answered',
            })
        }

        // captured up front sir — this exact turn is what the closing atomic update below
        // re-checks is STILL unanswered, so a concurrent duplicate request (double-click,
        // client retry-on-timeout) can't silently overwrite this one's scored answer
        const currentTurnId = currentTurn._id
        const priorTurns = session.turns.slice(0, -1)
        const atCap = session.turns.length >= MAX_TURNS

        let Invoking
        try {
            Invoking = await callGroqJson(id, 'mockInterview', [
                {
                    role: 'system',
                    content: buildMockInterviewAnswerPrompt(session.resumeText, session.jd, priorTurns, currentTurn.question, answer.trim())
                        + (atCap ? '\n\nThis is the LAST question of the session — still return "nextQuestion" in the shape shown, it will simply be discarded.' : ''),
                },
                { role: 'user', content: 'Score the answer and return the next question. Return only the JSON.' },
            ])
        } catch (aiErr) {
            (req.log || logger).error('answer mock interview failed', { err: aiErr })
            return res.status(502).json({
                success: false,
                message: 'The AI is unavailable right now, please try again',
            })
        }

        const scored = parseJsonReply(Invoking?.choices?.[0]?.message?.content)
        if (!scored || typeof scored.score !== 'number') {
            return res.status(502).json({
                success: false,
                message: 'The AI response was not in the expected format, please try again',
            })
        }

        const scoredAnswer = answer.trim()
        const nextStatus = atCap
            ? 'completed'
            : (scored.nextQuestion?.question ? 'in-progress' : 'completed')

        // atomic sir — the filter re-checks (by _id AND still-unanswered) exactly what the
        // in-memory guard above already checked, closing the gap between that read and this
        // write. If a concurrent duplicate request already answered this same turn first,
        // this matches zero documents and we report 409 instead of clobbering their save.
        // (MongoDB won't allow a positional-filtered `$set` on `turns.$[cur].*` combined with
        // a `$push` on that same `turns` array in one update — "ConflictingUpdateOperators" —
        // so the append below has to be a second, separate call.)
        const updated = await MockInterview.findOneAndUpdate(
            {
                _id: sessionId,
                user: id,
                status: 'in-progress',
                turns: { $elemMatch: { _id: currentTurnId, answer: { $in: [null, undefined, ''] } } },
            },
            {
                $set: {
                    'turns.$[cur].answer': scoredAnswer,
                    'turns.$[cur].score': scored.score,
                    'turns.$[cur].feedback': scored.feedback,
                    'turns.$[cur].sampleAnswer': scored.sampleAnswer,
                    status: nextStatus,
                },
            },
            {
                returnDocument: 'after',
                arrayFilters: [{ 'cur._id': currentTurnId }],
            }
        )

        if (!updated) {
            return res.status(409).json({
                success: false,
                message: 'This question was already answered by another request, please refresh the session',
            })
        }

        let finalDoc = updated
        if (nextStatus === 'in-progress') {
            // safe as a second, separate, unconditional append sir — the race this function
            // guards against is two requests double-answering the SAME turn, not which one
            // gets to append the next turn (only the request that won the update above gets here)
            finalDoc = await MockInterview.findByIdAndUpdate(
                sessionId,
                {
                    $push: {
                        turns: {
                            question: scored.nextQuestion.question,
                            category: scored.nextQuestion.category,
                            difficulty: scored.nextQuestion.difficulty,
                        },
                    },
                },
                { returnDocument: 'after' }
            )
        }

        updateStreak(id)

        const scoredTurn = finalDoc.turns.id(currentTurnId)

        return res.status(200).json({
            success: true,
            scoredTurn: {
                question: scoredTurn.question,
                answer: scoredTurn.answer,
                score: scoredTurn.score,
                feedback: scoredTurn.feedback,
                sampleAnswer: scoredTurn.sampleAnswer,
            },
            status: finalDoc.status,
            nextTurn: finalDoc.status === 'in-progress' ? finalDoc.turns[finalDoc.turns.length - 1] : null,
        })
    } catch (error) {
        (req.log || logger).error('answer mock interview failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while scoring the answer',
        })
    }
}

// GET /mock-interview — session list for the sidebar sir
exports.getMockInterviews = async (req, res) => {
    try {
        const id = req?.User.id

        const sessions = await MockInterview.find({ user: id })
            .select('role status updatedAt createdAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            sessions,
        })
    } catch (error) {
        (req.log || logger).error('get mock interviews failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the mock interview sessions',
        })
    }
}

// GET /mock-interview/:sessionId — full transcript sir
exports.getMockInterview = async (req, res) => {
    try {
        const id = req?.User.id
        const { sessionId } = req.params

        if (!mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session id',
            })
        }

        // resumeText/jd stay server-side, no need to ship them to the frontend sir
        const session = await MockInterview.findOne({ _id: sessionId, user: id })
            .select('role status turns createdAt updatedAt')

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview session not found',
            })
        }

        return res.status(200).json({
            success: true,
            session,
        })
    } catch (error) {
        (req.log || logger).error('get mock interview failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the mock interview session',
        })
    }
}

// DELETE /mock-interview/:sessionId sir
exports.deleteMockInterview = async (req, res) => {
    try {
        const id = req?.User.id
        const { sessionId } = req.params

        if (!mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session id',
            })
        }

        const session = await MockInterview.findOneAndDelete({ _id: sessionId, user: id })
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview session not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Mock interview session deleted',
        })
    } catch (error) {
        (req.log || logger).error('delete mock interview failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the mock interview session',
        })
    }
}
