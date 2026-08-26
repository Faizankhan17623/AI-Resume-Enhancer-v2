
const { PDFParse } = require('pdf-parse');

const Resume = require('../Models/Resume');
const { runReview } = require('../services/reviewService');
const { checkAtsFormatting } = require('../utils/atsFormatCheck');
const { validatePdfUpload } = require('../utils/pdfUpload');
const logger = require('../utils/logger');

// Thin controllers sir — parse the request, call the service, shape the response.
// The review logic itself lives in services/reviewService.js, so it can be reused and tested
// without an HTTP layer. See that file for why the old (req, res) signature was a problem.

// one place that turns a service result into a response sir, so both endpoints answer identically
const send = (res, result) => {
    if (!result.ok) {
        return res.status(result.status).json({
            success: false,
            message: result.message,
            ...(result.code !== undefined ? { code: result.code } : {}),
            ...(result.note !== undefined ? { note: result.note } : {}),
            ...(result.disabledUntil !== undefined ? { disabledUntil: result.disabledUntil } : {}),
        })
    }

    return res.status(result.status).json({
        success: true,
        reviewId: result.reviewId,
        review: result.review,
        formattingCheck: result.formattingCheck,
    })
}

// POST /response — review a freshly uploaded PDF sir
exports.Calling = async (req, res) => {
    try {
        const id = req?.User.id

        const PDf = req.files?.PDf;
        const uploadError = validatePdfUpload(PDf);
        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError,
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

        // structural ATS parse-safety scan sir — runs on the raw PDF bytes, entirely independent
        // of the Groq call (runReview never reads formattingCheck, it only stores it alongside
        // the AI result). Previously this was awaited to completion BEFORE runReview was even
        // called, so every request paid the full pdfjs parse time and the full Groq call time
        // back to back. Handing runReview the PROMISE instead of the resolved value lets it kick
        // off the Groq call immediately and only await formatting once the AI response is back —
        // the two genuinely run concurrently now, so the wait is whichever is slower, not their
        // sum. Still never eats a credit or blocks the review if it fails.
        const formattingCheckPromise = checkAtsFormatting(PDf.data).catch((fmtErr) => {
            logger.warn('ATS formatting check failed', { err: fmtErr, userId: id })
            return null
        })

        return send(res, await runReview({
            userId: id,
            resumeText: result.text,
            jd: req.body.jd,
            formattingCheck: formattingCheckPromise,
        }))
    } catch (error) {
        (req.log || logger).error('calling failed', { err: error })
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

        return send(res, await runReview({
            userId: id,
            resumeText: resume.resumeText,
            jd: req.body.jd,
            formattingCheck: resume.formattingCheck,
        }))
    } catch (error) {
        (req.log || logger).error('calling from saved resume failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while analyzing the resume',
        });
    }
}
