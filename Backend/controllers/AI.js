
const { PDFParse } = require('pdf-parse');
const Grok = require('groq-sdk')

const User = require('../Models/User');
const Review = require('../Models/Review');
const Resume = require('../Models/Resume');
const { consumeCredit } = require('../utils/Plans');
const { buildReviewSystemPrompt } = require('../utils/Prompts');
const { logAi } = require('../utils/AdminLog');
const { updateStreak } = require('../utils/Streak');
const { recordFeatureUse } = require('../utils/FeatureUsage');
const { checkAtsFormatting } = require('../utils/atsFormatCheck');
const { AI_MODEL } = require('../utils/AiModel');

const grok = new Grok({apiKey:process.env.GROK_API_KEY})

// shared core sir — both a fresh PDF upload and a re-score from a saved resume land here once
// the resume text is in hand. Spends one credit, calls Groq, saves the Review, returns the same
// response shape either way.
const runReview = async (req, res, { userId, resumeText, formattingCheck }) => {
    const jd = req.body.jd

    // not case sir
    if (!jd || typeof jd !== 'string' || !jd.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Job Description and Resume are required',
        });
    }

    const spend = await consumeCredit(userId)

    if (!spend.ok) {
        return res.status(403).json({
            success: false,
            message: spend.message
        })
    }

    // plan-aware system prompt sir — Basic gets the core review, Pro adds keyword/section analysis, ProMax gets the full deep report
    const Messages = [
        {
            role: "system",
            content: buildReviewSystemPrompt(spend.plan)
        },
        {
            role: "user",
            content: `Analyze the following.\n\n=== JOB DESCRIPTION ===\n${jd}\n\n=== RESUME ===\n${resumeText}\n\nReturn only the JSON review.`
        }
    ]

    // timed + logged sir — every call lands in AiLog for the admin cost monitor
    const t0 = Date.now()
    let Invoking
    try {
        Invoking = await grok.chat.completions.create({
            messages: Messages,
            "model": AI_MODEL,
            "temperature": 0,
            "response_format": { type: "json_object" },
        })
        logAi({ user: userId, type: 'review', plan: spend.plan, model: AI_MODEL, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
    } catch (aiErr) {
        logAi({ user: userId, type: 'review', plan: spend.plan, model: AI_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
        throw aiErr
    }

    // pull the model's text, guard against an empty/odd response sir
    let raw = Invoking?.choices?.[0]?.message?.content
    if (!raw) {
        return res.status(502).json({
            success: false,
            message: 'The AI returned an empty response, please try again',
        });
    }

    // strip the model's <think> reasoning block (qwen) sir
    if (raw.includes('</think>')) {
        raw = raw.split('</think>').pop()
    }
    // strip stray ```json fences in case the model wraps it sir
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    // parse the JSON safely — bad JSON shouldn't crash into the generic 500 sir
    let review
    try {
        review = JSON.parse(raw)
    } catch (parseErr) {
        console.log('JSON parse failed:', parseErr.message)
        console.log('Raw model output:', raw)
        return res.status(502).json({
            success: false,
            message: 'The AI response was not in the expected format, please try again',
        });
    }

    // basic shape check so the frontend never gets half-data sir
    if (typeof review.atsScore !== 'number') {
        return res.status(502).json({
            success: false,
            message: 'The AI response was incomplete, please try again',
        });
    }

    // save the review for history + the score-progress graph sir
    // a save failure should never eat a review the user already paid a credit for, so it only logs
    let reviewId = null
    try {
        const saved = await Review.create({
            user: userId,
            plan: spend.plan,
            jdTitle: jd.trim().slice(0, 60),
            atsScore: review.atsScore,
            verdict: review.verdict,
            scoreBreakdown: review.scoreBreakdown,
            review,
            formattingCheck,
        })
        reviewId = saved._id
    } catch (saveErr) {
        console.log('review history save failed:', saveErr.message)
    }

    // fire-and-forget sir — a streak failure must never break the review response
    updateStreak(userId)
    recordFeatureUse(userId)

    return res.status(200).json({
        success: true,
        reviewId,
        review,
        formattingCheck,
    });
}

// exported sir — controllers/BuiltResume.js reuses this same core to score a built resume
// against a JD without duplicating the credit-spend/Groq-call/save logic
exports.runReview = runReview

exports.Calling = async (req,res) =>{
    try {

        const id = req?.User.id

        const PDf = req.files?.PDf;
        // not a pdf or word file error sir
        if (!PDf) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded file must be a PDF or Word document',
            });
        }

        const parser = new PDFParse({ data: PDf.data });
        const result = await parser.getText();

        // getText returns an object sir — the actual resume text lives in .text
        if (!result?.text) {
            return res.status(400).json({
                success: false,
                message: 'error in getting the result from the pdf',
            });
        }

        // structural ATS parse-safety scan sir — runs on the raw PDF bytes, separate from the
        // Groq call, so it never eats a credit or blocks the review if it fails
        let formattingCheck = null
        try {
            formattingCheck = await checkAtsFormatting(PDf.data)
        } catch (fmtErr) {
            console.log('ATS formatting check failed:', fmtErr.message)
        }

        return await runReview(req, res, { userId: id, resumeText: result.text, formattingCheck })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while analyzing the resume',
        });
    }

}

// POST /response/from-resume/:resumeId — re-score a previously saved resume against a new JD sir,
// no re-upload needed. Same credit spend and Review record as a fresh upload.
exports.CallingFromSavedResume = async (req, res) => {
    try {
        const id = req?.User.id
        const { resumeId } = req.params

        const resume = await Resume.findOne({ _id: resumeId, user: id })
        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Saved resume not found',
            })
        }

        return await runReview(req, res, { userId: id, resumeText: resume.resumeText, formattingCheck: resume.formattingCheck })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while analyzing the resume',
        });
    }
}
