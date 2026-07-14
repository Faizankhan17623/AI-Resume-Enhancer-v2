const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')
const Grok = require('groq-sdk')

const BuiltResume = require('../Models/BuiltResume')
const { consumeCredit } = require('../utils/Plans')
const { buildResumeGeneratorPrompt, buildResumeTailorPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY })

// fields a client is allowed to write sir — keeps user/_id/timestamps out of req.body reaching the DB
const WRITABLE_FIELDS = ['templateId', 'title', 'personalInfo', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications']

const pickWritable = (body) => {
    const out = {}
    for (const key of WRITABLE_FIELDS) {
        if (body[key] !== undefined) out[key] = body[key]
    }
    return out
}

// POST /built-resumes — create a new one sir, usually right after picking a template (mostly-empty data)
exports.createBuiltResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { templateId } = req.body

        if (!templateId) {
            return res.status(400).json({
                success: false,
                message: 'A template must be selected',
            })
        }

        const resume = await BuiltResume.create({
            user: id,
            ...pickWritable(req.body),
        })

        return res.status(201).json({
            success: true,
            message: 'Resume created',
            resume,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the resume',
        })
    }
}

// GET /built-resumes — the user's builder list sir, newest edited first
exports.getBuiltResumes = async (req, res) => {
    try {
        const id = req?.User.id

        const resumes = await BuiltResume.find({ user: id })
            .select('title templateId updatedAt createdAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            resumes,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your resumes',
        })
    }
}

// GET /built-resumes/:resumeId — full data for the editor/preview sir
exports.getBuiltResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { resumeId } = req.params

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resume id',
            })
        }

        const resume = await BuiltResume.findOne({ _id: resumeId, user: id })
        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        return res.status(200).json({
            success: true,
            resume,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the resume',
        })
    }
}

// PUT /built-resumes/:resumeId — full-document save sir, used by the builder's autosave
exports.updateBuiltResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { resumeId } = req.params

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resume id',
            })
        }

        const resume = await BuiltResume.findOneAndUpdate(
            { _id: resumeId, user: id },
            { $set: pickWritable(req.body) },
            { new: true, runValidators: true }
        )

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Resume saved',
            resume,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving the resume',
        })
    }
}

// DELETE /built-resumes/:resumeId sir
exports.deleteBuiltResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { resumeId } = req.params

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resume id',
            })
        }

        const resume = await BuiltResume.findOneAndDelete({ _id: resumeId, user: id })
        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Resume deleted successfully',
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the resume',
        })
    }
}

// shared Groq call + JSON parsing sir — both AI builder features land here once they have
// their system prompt + user content ready. Mirrors the parsing/guard pattern in controllers/AI.js
const runBuilderAi = async ({ userId, plan, type, systemPrompt, userContent }) => {
    const t0 = Date.now()
    let completion
    try {
        completion = await grok.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            model: 'qwen/qwen3-32b',
            temperature: 0,
            response_format: { type: 'json_object' },
        })
        logAi({ user: userId, type, plan, model: 'qwen/qwen3-32b', usage: completion.usage, latencyMs: Date.now() - t0, success: true })
    } catch (aiErr) {
        logAi({ user: userId, type, plan, model: 'qwen/qwen3-32b', latencyMs: Date.now() - t0, success: false, error: aiErr.message })
        throw aiErr
    }

    let raw = completion?.choices?.[0]?.message?.content
    if (!raw) {
        return { error: 'The AI returned an empty response, please try again' }
    }

    if (raw.includes('</think>')) {
        raw = raw.split('</think>').pop()
    }
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    try {
        return { data: JSON.parse(raw) }
    } catch (parseErr) {
        console.log('JSON parse failed:', parseErr.message)
        console.log('Raw model output:', raw)
        return { error: 'The AI response was not in the expected format, please try again' }
    }
}

// POST /built-resumes/generate — feature 1 sir: user gives raw career info (+ optional target role),
// LLM drafts a full resume into a BuiltResume the user then picks a template for and can edit further
exports.generateResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { rawInfo, targetRole, templateId } = req.body

        if (!rawInfo || !rawInfo.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please describe your background, skills and experience first',
            })
        }
        if (!templateId) {
            return res.status(400).json({
                success: false,
                message: 'A template must be selected',
            })
        }

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({
                success: false,
                message: spend.message,
            })
        }

        const userContent = `=== CANDIDATE'S OWN DESCRIPTION OF THEIR BACKGROUND ===\n${rawInfo}\n\n${
            targetRole ? `=== TARGET ROLE ===\n${targetRole}\n\n` : ''
        }Return only the JSON resume.`

        const { data, error } = await runBuilderAi({
            userId: id,
            plan: spend.plan,
            type: 'resume-generate',
            systemPrompt: buildResumeGeneratorPrompt(),
            userContent,
        })

        if (error) {
            return res.status(502).json({ success: false, message: error })
        }

        const resume = await BuiltResume.create({
            user: id,
            templateId,
            title: data.title || 'AI-generated resume',
            personalInfo: data.personalInfo || {},
            summary: data.summary || '',
            experience: data.experience || [],
            education: data.education || [],
            skills: data.skills || [],
            projects: data.projects || [],
            certifications: data.certifications || [],
        })

        return res.status(201).json({
            success: true,
            message: 'Resume generated successfully',
            resume,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while generating the resume',
        })
    }
}

// POST /built-resumes/tailor — feature 2 sir: user uploads an OLD resume PDF + pastes a JD,
// LLM rewrites/restructures it tailored to that job into a new editable BuiltResume
exports.tailorResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { jd, templateId } = req.body

        if (!jd || !jd.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A job description is required',
            })
        }
        if (!templateId) {
            return res.status(400).json({
                success: false,
                message: 'A template must be selected',
            })
        }

        const PDf = req.files?.PDf
        if (!PDf) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded file must be a PDF or Word document',
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

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({
                success: false,
                message: spend.message,
            })
        }

        const userContent = `=== JOB DESCRIPTION ===\n${jd}\n\n=== CANDIDATE'S EXISTING RESUME ===\n${result.text}\n\nReturn only the JSON resume.`

        const { data, error } = await runBuilderAi({
            userId: id,
            plan: spend.plan,
            type: 'resume-tailor',
            systemPrompt: buildResumeTailorPrompt(),
            userContent,
        })

        if (error) {
            return res.status(502).json({ success: false, message: error })
        }

        const resume = await BuiltResume.create({
            user: id,
            templateId,
            title: data.title || `Tailored resume — ${jd.trim().slice(0, 40)}`,
            personalInfo: data.personalInfo || {},
            summary: data.summary || '',
            experience: data.experience || [],
            education: data.education || [],
            skills: data.skills || [],
            projects: data.projects || [],
            certifications: data.certifications || [],
        })

        return res.status(201).json({
            success: true,
            message: 'Resume tailored successfully',
            resume,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while tailoring the resume',
        })
    }
}
