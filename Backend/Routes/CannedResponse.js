const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport } = require('../Middlewares/Auth.js')
const { validate } = require('../Middlewares/Validate.js')
const { createCannedResponseSchema, updateCannedResponseSchema } = require('../Validation/schemas.js')
const {
    listCannedResponses,
    createCannedResponse,
    updateCannedResponse,
    deleteCannedResponse,
} = require('../controllers/CannedResponse.js')

// isSupport allows both Support AND Admin through sir — same gate shape as everywhere else that
// needs "at least Support" access. Write actions are Admin-only, per direct request.
route.get('/admin/canned-responses', Auth, isSupport, listCannedResponses)
route.post('/admin/canned-responses', Auth, isAdmin, validate({ body: createCannedResponseSchema }), createCannedResponse)
route.patch('/admin/canned-responses/:responseId', Auth, isAdmin, validate({ body: updateCannedResponseSchema }), updateCannedResponse)
route.delete('/admin/canned-responses/:responseId', Auth, isAdmin, deleteCannedResponse)

module.exports = route
