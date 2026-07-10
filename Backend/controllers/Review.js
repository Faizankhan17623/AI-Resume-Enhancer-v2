const mongoose = require('mongoose')
const crypto = require('crypto')
const PDFDocument = require('pdfkit')

const Review = require('../Models/Review')
const { getUserPlan } = require('../utils/Plans')

// GET /reviews — the user's review history sir, newest first
// light fields only so the list + progress graph load fast (full report stays behind /reviews/:id)
exports.getReviews = async (req, res) => {
    try {
        const id = req?.User.id

        const reviews = await Review.find({ user: id })
            .select('jdTitle atsScore verdict plan createdAt')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            reviews
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the review history',
        })
    }
}

// GET /reviews/progress — score-over-time data for the graph sir, oldest first so the line draws left to right
exports.getProgress = async (req, res) => {
    try {
        const id = req?.User.id

        const points = await Review.find({ user: id })
            .select('atsScore jdTitle createdAt')
            .sort({ createdAt: 1 })

        // a couple of headline stats for the dashboard cards sir
        const scores = points.map(p => p.atsScore)
        const best = scores.length ? Math.max(...scores) : 0
        const latest = scores.length ? scores[scores.length - 1] : 0
        const first = scores.length ? scores[0] : 0

        return res.status(200).json({
            success: true,
            stats: {
                totalReviews: points.length,
                bestScore: best,
                latestScore: latest,
                improvement: latest - first,
            },
            points
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the progress data',
        })
    }
}

// GET /reviews/:reviewId — one full saved report sir
exports.getReview = async (req, res) => {
    try {
        const id = req?.User.id
        const { reviewId } = req.params

        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid review id',
            })
        }

        // filtering by user too so nobody reads someone else's review sir
        const review = await Review.findOne({ _id: reviewId, user: id })

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            })
        }

        return res.status(200).json({
            success: true,
            review
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the review',
        })
    }
}

// ---------- SHAREABLE PUBLIC REPORT ----------

// POST /reviews/:reviewId/share — toggle a review's public share link sir
// generates a shareId once (kept stable across re-shares) and flips isPublic on/off
exports.toggleShare = async (req, res) => {
    try {
        const id = req?.User.id
        const { reviewId } = req.params

        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid review id',
            })
        }

        const review = await Review.findOne({ _id: reviewId, user: id })

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            })
        }

        // flip it sir — turning share back on re-uses the same shareId if one already exists
        review.isPublic = !review.isPublic
        if (review.isPublic && !review.shareId) {
            review.shareId = crypto.randomBytes(9).toString('base64url')
        }
        await review.save()

        return res.status(200).json({
            success: true,
            isPublic: review.isPublic,
            shareId: review.isPublic ? review.shareId : undefined,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the share link',
        })
    }
}

// GET /public/reviews/:shareId — public summary card sir, NO auth
// only a safe subset is ever returned — no JD, no missing keywords, no rewrites,
// nothing that leaks the resume content or the job the user is targeting
exports.getPublicReview = async (req, res) => {
    try {
        const { shareId } = req.params

        const review = await Review.findOne({ shareId, isPublic: true })

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'This shared report was not found or is no longer public',
            })
        }

        return res.status(200).json({
            success: true,
            report: {
                atsScore: review.atsScore,
                verdict: review.verdict,
                scoreBreakdown: review.scoreBreakdown,
                strengths: review.review?.strengths || [],
                summary: review.review?.summary,
                createdAt: review.createdAt,
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the shared report',
        })
    }
}

// ---------- PDF EXPORT ----------

// small pdfkit helpers sir — keep the layout code readable below
const COLORS = {
    heading: '#1a1a2e',
    body: '#333333',
    muted: '#777777',
    accent: '#4f46e5',
    good: '#16a34a',
    warn: '#d97706',
    bad: '#dc2626',
}

const scoreColor = (score) =>
    score >= 70 ? COLORS.good : score >= 50 ? COLORS.warn : COLORS.bad

// section title with a thin underline sir
const sectionTitle = (doc, text) => {
    doc.moveDown(1)
    doc.fillColor(COLORS.accent).fontSize(14).font('Helvetica-Bold').text(text)
    doc.moveTo(doc.x, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(COLORS.accent).lineWidth(0.5).stroke()
    doc.moveDown(0.5)
}

const bulletList = (doc, items) => {
    for (const item of items || []) {
        doc.fillColor(COLORS.body).fontSize(10).font('Helvetica').text(`•  ${item}`, { indent: 10 })
        doc.moveDown(0.2)
    }
}

// GET /reviews/:reviewId/pdf — download the report as a styled PDF sir (paid plans only)
exports.downloadReviewPdf = async (req, res) => {
    try {
        const id = req?.User.id
        const { reviewId } = req.params

        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid review id',
            })
        }

        // PDF export is a paid feature sir — Basic gets the upgrade nudge
        const plan = await getUserPlan(id)
        if (!plan || plan.key === 'Basic') {
            return res.status(403).json({
                success: false,
                message: 'PDF export is a Pro feature, please upgrade your plan',
            })
        }

        const saved = await Review.findOne({ _id: reviewId, user: id })

        if (!saved) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            })
        }

        const r = saved.review

        // stream the PDF straight into the response sir — no temp files on disk
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="ats-review-${saved._id}.pdf"`)

        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        doc.pipe(res)

        // ----- header -----
        doc.fillColor(COLORS.heading).fontSize(20).font('Helvetica-Bold').text('ATS Resume Review')
        doc.fillColor(COLORS.muted).fontSize(9).font('Helvetica')
            .text(`${saved.jdTitle || 'Job Description'}  •  ${new Date(saved.createdAt).toDateString()}  •  ${saved.plan} plan`)
        doc.moveDown(1)

        // ----- big score -----
        doc.fillColor(scoreColor(saved.atsScore)).fontSize(42).font('Helvetica-Bold')
            .text(`${saved.atsScore}/100`, { continued: true })
        doc.fillColor(COLORS.heading).fontSize(14).font('Helvetica-Bold')
            .text(`   ${r.verdict || ''}`)
        doc.moveDown(0.3)
        doc.fillColor(COLORS.body).fontSize(10).font('Helvetica').text(r.summary || '')

        // ----- score breakdown -----
        if (r.scoreBreakdown) {
            sectionTitle(doc, 'Score Breakdown')
            const labels = {
                keywordMatch: 'Keyword Match',
                experienceRelevance: 'Experience Relevance',
                skillsCoverage: 'Skills Coverage',
                formatting: 'Formatting',
            }
            for (const [key, label] of Object.entries(labels)) {
                const val = r.scoreBreakdown[key]
                if (typeof val !== 'number') continue
                doc.fillColor(COLORS.body).fontSize(10).font('Helvetica').text(`${label}: `, { continued: true })
                doc.fillColor(scoreColor(val)).font('Helvetica-Bold').text(`${val}/100`)
                doc.moveDown(0.2)
            }
        }

        // ----- ProMax extra: recruiter first impression sir -----
        if (r.recruiterFirstImpression) {
            sectionTitle(doc, 'Recruiter First Impression')
            doc.fillColor(COLORS.body).fontSize(10).font('Helvetica').text(r.recruiterFirstImpression)
        }

        if (r.strengths?.length) {
            sectionTitle(doc, 'Strengths')
            bulletList(doc, r.strengths)
        }

        if (r.redFlags?.length) {
            sectionTitle(doc, 'Red Flags')
            bulletList(doc, r.redFlags)
        }

        if (r.missingKeywords?.length) {
            sectionTitle(doc, 'Missing Keywords')
            bulletList(doc, r.missingKeywords)
        }

        // ----- Pro extra: keyword analysis sir -----
        if (r.keywordAnalysis) {
            sectionTitle(doc, 'Keyword Analysis')
            const groups = [['Matched', r.keywordAnalysis.matched], ['Weak', r.keywordAnalysis.weak], ['Missing', r.keywordAnalysis.missing]]
            for (const [label, words] of groups) {
                if (!words?.length) continue
                doc.fillColor(COLORS.heading).fontSize(10).font('Helvetica-Bold').text(label)
                bulletList(doc, words)
                doc.moveDown(0.3)
            }
        }

        // ----- Pro extra: section feedback sir -----
        if (r.sectionFeedback?.length) {
            sectionTitle(doc, 'Section Feedback')
            for (const s of r.sectionFeedback) {
                doc.fillColor(COLORS.heading).fontSize(10).font('Helvetica-Bold').text(`${s.section} — `, { continued: true })
                doc.fillColor(scoreColor(s.score)).text(`${s.score}/100`)
                doc.fillColor(COLORS.body).font('Helvetica').text(s.feedback || '', { indent: 10 })
                doc.moveDown(0.4)
            }
        }

        // ----- improvements sir — the before/after rewrites -----
        if (r.improvements?.length) {
            sectionTitle(doc, 'Improvements')
            r.improvements.forEach((imp, i) => {
                doc.fillColor(COLORS.heading).fontSize(10).font('Helvetica-Bold')
                    .text(`${i + 1}. [${(imp.priority || '').toUpperCase()}] ${imp.issue || ''}`)
                if (imp.before) {
                    doc.fillColor(COLORS.muted).fontSize(9).font('Helvetica-Oblique').text(`Before: ${imp.before}`, { indent: 12 })
                }
                if (imp.after) {
                    doc.fillColor(COLORS.body).fontSize(9).font('Helvetica').text(`After: ${imp.after}`, { indent: 12 })
                }
                doc.moveDown(0.5)
            })
        }

        if (r.quickWins?.length) {
            sectionTitle(doc, 'Quick Wins')
            bulletList(doc, r.quickWins)
        }

        // ----- ProMax extras sir -----
        if (r.rewrittenSummary) {
            sectionTitle(doc, 'Rewritten Professional Summary')
            doc.fillColor(COLORS.body).fontSize(10).font('Helvetica').text(r.rewrittenSummary)
        }

        if (r.interviewPrep?.length) {
            sectionTitle(doc, 'Interview Prep')
            r.interviewPrep.forEach((q, i) => {
                doc.fillColor(COLORS.heading).fontSize(10).font('Helvetica-Bold').text(`Q${i + 1}. ${q.question || ''}`)
                if (q.whyAsked) doc.fillColor(COLORS.muted).fontSize(9).font('Helvetica-Oblique').text(`Why: ${q.whyAsked}`, { indent: 12 })
                if (q.howToAnswer) doc.fillColor(COLORS.body).fontSize(9).font('Helvetica').text(`How to answer: ${q.howToAnswer}`, { indent: 12 })
                doc.moveDown(0.5)
            })
        }

        if (r.learningRoadmap?.length) {
            sectionTitle(doc, 'Learning Roadmap')
            for (const item of r.learningRoadmap) {
                doc.fillColor(COLORS.heading).fontSize(10).font('Helvetica-Bold')
                    .text(`${item.skill || ''} — ${(item.priority || '').toUpperCase()}`)
                doc.fillColor(COLORS.body).fontSize(9).font('Helvetica').text(item.advice || '', { indent: 12 })
                doc.moveDown(0.4)
            }
        }

        // ----- footer -----
        doc.moveDown(1.5)
        doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica')
            .text('Generated by AI Resume Enhancer', { align: 'center' })

        doc.end()
    } catch (error) {
        console.log(error)
        console.log(error.message)
        // headers may already be sent mid-stream sir — only send JSON if they are not
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while generating the PDF',
            })
        }
        res.end()
    }
}
