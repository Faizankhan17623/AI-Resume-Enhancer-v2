const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const {
    saveResume,
    getResumes,
    updateResume,
    deleteResume
} = require('../controllers/Resume.js')

// the resume library sir — save once, reuse across reviews/chats/cover letters without re-uploading
// no aiLimiter here sir — parsing a PDF into text is not a Groq call, same as GrammarCheck

route.post('/resumes', Auth, saveResume)
route.get('/resumes', Auth, getResumes)
route.patch('/resumes/:resumeId', Auth, updateResume)
route.delete('/resumes/:resumeId', Auth, deleteResume)

module.exports = route
