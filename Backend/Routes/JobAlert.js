const express = require('express')
const route = express.Router()
const { Auth, isUser } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { createJobAlertSchema, updateJobAlertSchema } = require('../Validation/schemas.js')
const { createJobAlert, listJobAlerts, updateJobAlert, deleteJobAlert } = require('../controllers/JobAlert.js')

// candidate-only sir — recruiters post jobs, they don't get alerted about their own board
route.post('/job-alerts', Auth, isUser, validate({ body: createJobAlertSchema }), createJobAlert)
route.get('/job-alerts', Auth, isUser, listJobAlerts)
route.patch('/job-alerts/:alertId', Auth, isUser, validate({ body: updateJobAlertSchema }), updateJobAlert)
route.delete('/job-alerts/:alertId', Auth, isUser, deleteJobAlert)

module.exports = route
