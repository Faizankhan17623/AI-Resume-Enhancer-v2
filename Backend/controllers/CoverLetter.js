const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')
const Grok = require('groq-sdk')

const CoverLetter = require('../Models/CoverLetter')
const { getUserPlan } = require('../utils/Plans')
const { buildCoverLetterPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { AI_MODEL } = require('../utils/AiModel')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY })

// POST /cover-letter — generate a tailored cover letter from a resume PDF + JD sir
// Pro+ feature, same as the chat coach's cover-letter drafting — no separate credit spend,
// it rides on the plan gate the same way PDF export does
exports.generateCoverLetter = async (req, res) => {
    try {
        const id = req?.User.id

        const plan = await getUserPlan(id)
        if (!plan || plan.key === 'Basic') {
            return res.status(403).json({
                success: false,
                message: 'Cover letter generation is a Pro feature, please upgrade your plan',
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
                content: buildCoverLetterPrompt(result.text, jd),
            },
            {
                role: 'user',
                content: 'Write the cover letter now.',
            },
        ]

        const t0 = Date.now()
        let Invoking
        try {
            Invoking = await grok.chat.completions.create({
                messages: Messages,
                model: AI_MODEL,
                temperature: 0.4,
            })
            logAi({ user: id, type: 'cover-letter', plan: plan.key, model: AI_MODEL, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'cover-letter', plan: plan.key, model: AI_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = Invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty response, please try again',
            })
        }

        // strip the model's <think> reasoning block (qwen) sir, same as the review/chat controllers
        if (raw.includes('</think>')) {
            raw = raw.split('</think>').pop()
        }
        raw = raw.trim()

        let coverLetterId = null
        try {
            const saved = await CoverLetter.create({
                user: id,
                jdTitle: jd.trim().slice(0, 60),
                content: raw,
            })
            coverLetterId = saved._id
        } catch (saveErr) {
            console.log('cover letter save failed:', saveErr.message)
        }

        // fire-and-forget sir — same rule as the review/chat controllers
        recordFeatureUse(id)

        return res.status(200).json({
            success: true,
            coverLetterId,
            content: raw,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while generating the cover letter',
        })
    }
}

// GET /cover-letter — the user's saved cover letters sir, newest first
exports.getCoverLetters = async (req, res) => {
    try {
        const id = req?.User.id

        const letters = await CoverLetter.find({ user: id })
            .select('jdTitle createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            letters,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your cover letters',
        })
    }
}

// GET /cover-letter/:id — one saved cover letter sir
exports.getCoverLetter = async (req, res) => {
    try {
        const id = req?.User.id
        const { coverLetterId } = req.params

        if (!mongoose.isValidObjectId(coverLetterId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid cover letter id',
            })
        }

        const letter = await CoverLetter.findOne({ _id: coverLetterId, user: id })

        if (!letter) {
            return res.status(404).json({
                success: false,
                message: 'Cover letter not found',
            })
        }

        return res.status(200).json({
            success: true,
            letter,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the cover letter',
        })
    }
}
