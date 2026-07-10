
const { PDFParse } = require('pdf-parse');
const Grok = require('groq-sdk')

const User = require('../Models/User');
const Review = require('../Models/Review');
const { consumeCredit } = require('../utils/Plans');
const { buildReviewSystemPrompt } = require('../utils/Prompts');
const { logAi } = require('../utils/AdminLog');
const { updateStreak } = require('../utils/Streak');

const grok = new Grok({apiKey:process.env.GROK_API_KEY})

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

        // plan-aware credit check sir — Basic gets 5, Pro gets 100, ProMax unlimited
        const spend = await consumeCredit(id)

        if (!spend.ok) {
            return res.status(403).json({
                success:false,
                message: spend.message
            })
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

        const jd = req.body.jd
        // const Resume = req.body.Resume

        // not case sir
        if (!jd) {
            return res.status(400).json({
                success: false,
                message: 'Job Description and Resume are required',
            });
        }

        // plan-aware system prompt sir — Basic gets the core review, Pro adds keyword/section analysis, ProMax gets the full deep report
        const Messages = [
            {
                role: "system",
                content: buildReviewSystemPrompt(spend.plan)
            },
            {
                role: "user",
                content: `Analyze the following.\n\n=== JOB DESCRIPTION ===\n${jd}\n\n=== RESUME ===\n${result.text}\n\nReturn only the JSON review.`
            }
        ]

        // timed + logged sir — every call lands in AiLog for the admin cost monitor
        const t0 = Date.now()
        let Invoking
        try {
            Invoking = await grok.chat.completions.create({
                messages: Messages,
                "model": "qwen/qwen3-32b",
                "temperature": 0,
                "response_format": { type: "json_object" },
            })
            logAi({ user: id, type: 'review', plan: spend.plan, model: 'qwen/qwen3-32b', usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'review', plan: spend.plan, model: 'qwen/qwen3-32b', latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }



        // console.log(Invoking)

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
                user: id,
                plan: spend.plan,
                jdTitle: jd.trim().slice(0, 60),
                atsScore: review.atsScore,
                verdict: review.verdict,
                scoreBreakdown: review.scoreBreakdown,
                review,
            })
            reviewId = saved._id
        } catch (saveErr) {
            console.log('review history save failed:', saveErr.message)
        }

        // fire-and-forget sir — a streak failure must never break the review response
        updateStreak(id)

        return res.status(200).json({
            success: true,
            reviewId,
            review
        });
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while analyzing the resume',
        });
    }

}