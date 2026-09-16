const express = require('express')
const route = express.Router()
const { Auth, isRecruiter, isApprovedRecruiter, isUser } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    scheduleInterviewSchema,
    confirmSlotSchema,
    cancelInterviewSchema,
} = require('../Validation/schemas.js')
const {
    scheduleInterview,
    confirmSlot,
    cancelInterview,
    listMyInterviews,
    getInterviewForApplication,
} = require('../controllers/Interview.js')

// interview scheduling sir — same strict role isolation as Routes/Job.js. Route ORDER matters:
// '/interviews/mine' must be declared before any '/interviews/:scheduleId' route, same reasoning
// as Routes/Job.js's own '/jobs/mine' comment.
route.get('/interviews/mine', Auth, isUser, listMyInterviews)
route.post('/interviews/:scheduleId/confirm', Auth, isUser, validate({ body: confirmSlotSchema }), confirmSlot)
// either role can cancel sir — the controller itself checks which one this caller actually is
route.patch('/interviews/:scheduleId/cancel', Auth, validate({ body: cancelInterviewSchema }), cancelInterview)

route.post('/job-applications/:applicationId/schedule-interview', Auth, isRecruiter, isApprovedRecruiter, validate({ body: scheduleInterviewSchema }), scheduleInterview)
route.get('/job-applications/:applicationId/interview', Auth, isRecruiter, isApprovedRecruiter, getInterviewForApplication)

module.exports = route
