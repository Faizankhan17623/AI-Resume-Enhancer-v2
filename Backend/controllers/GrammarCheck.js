const { PDFParse } = require('pdf-parse')
const { checkResumeText } = require('../utils/GrammarCheck')

// POST /grammar-check — free, instant pre-check sir, no AI credit spent
// runs before the paid ATS review so the user can fix typos before burning a credit
exports.checkGrammar = async (req, res) => {
    try {
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

        const { issues, score } = checkResumeText(result.text)

        return res.status(200).json({
            success: true,
            score,
            issues,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while checking the resume',
        })
    }
}
