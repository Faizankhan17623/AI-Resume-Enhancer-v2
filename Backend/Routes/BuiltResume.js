const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    createBuiltResume,
    getBuiltResumes,
    getBuiltResume,
    updateBuiltResume,
    deleteBuiltResume,
    generateResume,
    tailorResume,
    reviewBuiltResume,
    downloadBuiltResumeDocx,
} = require('../controllers/BuiltResume.js')

// the template-based resume builder sir — structured data a template component renders,
// distinct from the uploaded-PDF Resume model used by the AI review flow.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

// NOTE: /built-resumes/generate and /built-resumes/tailor must be registered BEFORE
// /built-resumes/:resumeId sir, otherwise express matches "generate"/"tailor" as a resumeId
route.post('/built-resumes/generate', Auth, isUser, aiLimiter, generateResume)
route.post('/built-resumes/tailor', Auth, isUser, aiLimiter, tailorResume)

route.post('/built-resumes', Auth, isUser, createBuiltResume)
route.get('/built-resumes', Auth, isUser, getBuiltResumes)
route.get('/built-resumes/:resumeId', Auth, isUser, getBuiltResume)
route.put('/built-resumes/:resumeId', Auth, isUser, updateBuiltResume)
route.delete('/built-resumes/:resumeId', Auth, isUser, deleteBuiltResume)
route.post('/built-resumes/:resumeId/review', Auth, isUser, aiLimiter, reviewBuiltResume)
route.get('/built-resumes/:resumeId/docx', Auth, isUser, downloadBuiltResumeDocx)

module.exports = route
