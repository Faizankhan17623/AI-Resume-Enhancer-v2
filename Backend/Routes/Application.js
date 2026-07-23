const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const {
    createApplication,
    getApplications,
    updateApplication,
    deleteApplication
} = require('../controllers/Application.js')

// the job application tracker sir — a plain Kanban board, no AI call anywhere in this file,
// so no dedicated limiter needed beyond the app-wide globalLimiter.
// isUser blocks Admin/Support too, this is a product feature, strictly User-only

route.post('/applications', Auth, isUser, createApplication)
route.get('/applications', Auth, isUser, getApplications)
route.patch('/applications/:applicationId', Auth, isUser, updateApplication)
route.delete('/applications/:applicationId', Auth, isUser, deleteApplication)

module.exports = route
