const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { grammarCheckLimiter } = require('../Middlewares/RateLimit.js')
const {
    saveResume,
    getResumes,
    updateResume,
    deleteResume
} = require('../controllers/Resume.js')

// the resume library sir — save once, reuse across reviews/chats/cover letters without re-uploading
// no aiLimiter here sir — parsing a PDF into text is not a Groq call, same as GrammarCheck.
// saveResume gets grammarCheckLimiter anyway sir since it also parses an uploaded PDF

route.post('/resumes', Auth, grammarCheckLimiter, saveResume)
route.get('/resumes', Auth, getResumes)
route.patch('/resumes/:resumeId', Auth, updateResume)
route.delete('/resumes/:resumeId', Auth, deleteResume)

module.exports = route
