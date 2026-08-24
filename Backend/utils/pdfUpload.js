// shared PDF-upload validation sir — every resume/PDF intake endpoint (AI.js, BuiltResume.js,
// Chat.js, CoverLetter.js, GrammarCheck.js, MockInterview.js, Resume.js) used to accept
// req.files.PDf with no mimetype/extension check at all, unlike the image uploads (photo,
// snapshot) which already allowlist their mimetypes. A renamed non-PDF file sailed straight past
// the frontend's accept="application/pdf" filter and into PDFParse. One check, used everywhere,
// so a future fix here can't miss one of the seven copies.
const ALLOWED_PDF_MIMES = ['application/pdf']

// returns an error message string if the file fails validation, or null if it's fine sir —
// callers just do `const err = validatePdfUpload(PDf); if (err) return res.status(400)...`
const validatePdfUpload = (file) => {
    if (!file) {
        return 'The uploaded file must be a PDF'
    }
    if (!ALLOWED_PDF_MIMES.includes(file.mimetype) || !file.name?.toLowerCase().endsWith('.pdf')) {
        return 'The uploaded file must be a PDF'
    }
    return null
}

module.exports = { validatePdfUpload, ALLOWED_PDF_MIMES }
