const mongoose = require('mongoose')
const logger = require('../utils/logger')
const { PDFParse } = require('pdf-parse')
const Grok = require('groq-sdk')

const OutreachMessage = require('../Models/OutreachMessage')
const { getUserPlan } = require('../utils/Plans')
const { buildOutreachMessagePrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { getModelForPlan } = require('../utils/AiModel')
const { isFeatureEnabled, getFeatureFlagDetails } = require('../utils/FeatureFlags')
const { validatePdfUpload } = require('../utils/pdfUpload')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY, timeout: 30 * 1000, maxRetries: 1 })

// POST /outreach-message — generate a short recruiter/hiring-manager outreach message from a
// resume PDF + JD sir. Same Pro+ gate and AI plumbing as controllers/CoverLetter.js, different
// artifact: a 3-5 sentence DM/email opener, not a formal letter — see buildOutreachMessagePrompt.
exports.generateOutreachMessage = async (req, res) => {
    try {
        const id = req?.User.id

        if (!(await isFeatureEnabled('feature.outreachMessage'))) {
            const details = await getFeatureFlagDetails('feature.outreachMessage')
            return res.status(503).json({
                success: false,
                message: 'This feature is temporarily disabled',
                note: details.note,
                disabledUntil: details.disabledUntil,
            })
        }

        const plan = await getUserPlan(id)
        if (!plan || plan.key === 'Basic') {
            return res.status(403).json({
                success: false,
                message: 'Outreach message generation is a Pro feature, please upgrade your plan',
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
        if (!jd) {
            return res.status(400).json({
                success: false,
                message: 'Job Description is required',
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

        const Messages = [
            {
                role: 'system',
                content: buildOutreachMessagePrompt(result.text, jd),
            },
            {
                role: 'user',
                content: 'Write the outreach message now.',
            },
        ]

        const model = getModelForPlan(plan.key)

        const t0 = Date.now()
        let Invoking
        try {
            Invoking = await grok.chat.completions.create({
                messages: Messages,
                model,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'outreach-message', plan: plan.key, model, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'outreach-message', plan: plan.key, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = Invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty response, please try again',
            })
        }

        // strip the model's <think> reasoning block (qwen) sir, same as the review/cover-letter controllers
        if (raw.includes('</think>')) {
            raw = raw.split('</think>').pop()
        }
        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

        let parsed
        try {
            parsed = JSON.parse(raw)
        } catch (parseErr) {
            // rawPreview only sir, same PII discipline as controllers/BuiltResume.js's runBuilderAi
            (req.log || logger).error('outreach message JSON parse failed', { err: parseErr, rawPreview: raw?.slice(0, 200) })
            return res.status(502).json({
                success: false,
                message: 'The AI response was not in the expected format, please try again',
            })
        }

        if (!parsed?.body) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty response, please try again',
            })
        }

        let outreachMessageId = null
        try {
            const saved = await OutreachMessage.create({
                user: id,
                jdTitle: jd.trim().slice(0, 60),
                subject: parsed.subject || '',
                body: parsed.body,
            })
            outreachMessageId = saved._id
        } catch (saveErr) {
            (req.log || logger).error('outreach message save failed', { err: saveErr })
        }

        // fire-and-forget sir — same rule as the review/cover-letter controllers
        recordFeatureUse(id)

        return res.status(200).json({
            success: true,
            outreachMessageId,
            subject: parsed.subject || '',
            body: parsed.body,
        })
    } catch (error) {
        (req.log || logger).error('generate outreach message failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while generating the outreach message',
        })
    }
}

// GET /outreach-message — the user's saved outreach messages sir, newest first
exports.getOutreachMessages = async (req, res) => {
    try {
        const id = req?.User.id

        const messages = await OutreachMessage.find({ user: id })
            .select('jdTitle createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            messages,
        })
    } catch (error) {
        (req.log || logger).error('get outreach messages failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your outreach messages',
        })
    }
}

// GET /outreach-message/:id — one saved outreach message sir
exports.getOutreachMessage = async (req, res) => {
    try {
        const id = req?.User.id
        const { outreachMessageId } = req.params

        if (!mongoose.isValidObjectId(outreachMessageId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid outreach message id',
            })
        }

        const message = await OutreachMessage.findOne({ _id: outreachMessageId, user: id })

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Outreach message not found',
            })
        }

        return res.status(200).json({
            success: true,
            message,
        })
    } catch (error) {
        (req.log || logger).error('get outreach message failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the outreach message',
        })
    }
}
