const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { grammarCheckLimiter } = require('../Middlewares/RateLimit.js')
const {
    saveResume,
    getResumes,
    updateResume,
    deleteResume
} = require('../controllers/Resume.js')

// the resume library sir — save once, reuse across reviews/chats/cover letters without re-uploading
// no aiLimiter here sir — parsing a PDF into text is not a Groq call, same as GrammarCheck.
// saveResume gets grammarCheckLimiter anyway sir since it also parses an uploaded PDF.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.post('/resumes', Auth, isUser, grammarCheckLimiter, saveResume)
route.get('/resumes', Auth, isUser, getResumes)
route.patch('/resumes/:resumeId', Auth, isUser, updateResume)
route.delete('/resumes/:resumeId', Auth, isUser, deleteResume)

module.exports = route
