const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')
const Grok = require('groq-sdk')

const MockInterview = require('../Models/MockInterview')
const { consumeCredit, getUserPlan } = require('../utils/Plans')
const { buildMockInterviewStartPrompt, buildMockInterviewAnswerPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { updateStreak } = require('../utils/Streak')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { getModelForPlan } = require('../utils/AiModel')
const { isFeatureEnabled, getFeatureFlagDetails } = require('../utils/FeatureFlags')

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
        console.log('mock interview JSON parse failed:', parseErr.message)
        console.log('Raw model output (truncated):', raw?.slice(0, 200))
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
        if (!PDf) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded file must be a PDF or Word document',
            })
        }

        const jd = req.body.jd
        if (!jd || !jd.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Job Description is required',
            })
        }

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({
                success: false,
                message: spend.message,
            })
        }

        const parser = new PDFParse({ data: PDf.data })
        const result = await parser.getText()
        if (!result?.text) {
            return res.status(400).json({
                success: false,
                message: 'error in getting the result from the pdf',
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
            console.log(aiErr)
            return res.status(502).json({
                success: false,
                message: 'The AI is unavailable right now, please try again',
            })
        }

        const first = parseJsonReply(Invoking?.choices?.[0]?.message?.content)
        if (!first || !first.question) {
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
        console.log(error)
        console.log(error.message)
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
            console.log(aiErr)
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

        currentTurn.answer = answer.trim()
        currentTurn.score = scored.score
        currentTurn.feedback = scored.feedback
        currentTurn.sampleAnswer = scored.sampleAnswer

        if (atCap) {
            session.status = 'completed'
        } else if (scored.nextQuestion?.question) {
            session.turns.push({
                question: scored.nextQuestion.question,
                category: scored.nextQuestion.category,
                difficulty: scored.nextQuestion.difficulty,
            })
        } else {
            // model didn't give a next question sir — end the session cleanly rather than error
            session.status = 'completed'
        }

        await session.save()
        updateStreak(id)

        return res.status(200).json({
            success: true,
            scoredTurn: {
                question: currentTurn.question,
                answer: currentTurn.answer,
                score: currentTurn.score,
                feedback: currentTurn.feedback,
                sampleAnswer: currentTurn.sampleAnswer,
            },
            status: session.status,
            nextTurn: session.status === 'in-progress' ? session.turns[session.turns.length - 1] : null,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
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
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the mock interview session',
        })
    }
}
