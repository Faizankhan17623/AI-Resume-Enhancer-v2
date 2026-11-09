const { PDFParse } = require('pdf-parse')
const { checkResumeText } = require('../utils/GrammarCheck')
const { validatePdfUpload } = require('../utils/pdfUpload')
const logger = require('../utils/logger')

// POST /grammar-check — free, instant pre-check sir, no AI credit spent
// runs before the paid ATS review so the user can fix typos before burning a credit
exports.checkGrammar = async (req, res) => {
    try {
        const PDf = req.files?.PDf
        const uploadError = validatePdfUpload(PDf)
        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError,
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

        // length cap sir, per 2026-11-09 audit — checkResumeText runs write-good and a word-by-
        // word dictionary check synchronously in-process, with no AI/external call in between.
        // A crafted huge PDF (text-bomb) used to turn into an unbounded regex/dictionary loop on
        // this server — a real CPU-DoS surface, worse than the already-capped AI endpoints since
        // those at least rate-limit via the external call. 50000 chars is generous for any real
        // resume while bounding the worst case.
        const { issues, score } = checkResumeText(result.text.slice(0, 50000))

        return res.status(200).json({
            success: true,
            score,
            issues,
        })
    } catch (error) {
        (req.log || logger).error('check grammar failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while checking the resume',
        })
    }
}
