const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    createBuiltResume,
    getBuiltResumes,
    getBuiltResume,
    updateBuiltResume,
    deleteBuiltResume,
    generateResume,
    tailorResume,
} = require('../controllers/BuiltResume.js')

// the template-based resume builder sir — structured data a template component renders,
// distinct from the uploaded-PDF Resume model used by the AI review flow

// NOTE: /built-resumes/generate and /built-resumes/tailor must be registered BEFORE
// /built-resumes/:resumeId sir, otherwise express matches "generate"/"tailor" as a resumeId
route.post('/built-resumes/generate', Auth, aiLimiter, generateResume)
route.post('/built-resumes/tailor', Auth, aiLimiter, tailorResume)

route.post('/built-resumes', Auth, createBuiltResume)
route.get('/built-resumes', Auth, getBuiltResumes)
route.get('/built-resumes/:resumeId', Auth, getBuiltResume)
route.put('/built-resumes/:resumeId', Auth, updateBuiltResume)
route.delete('/built-resumes/:resumeId', Auth, deleteBuiltResume)

module.exports = route
