const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { search } = require('../controllers/Search.js')

// any logged-in role sir — the controller itself branches by req.User.role and scopes every
// query accordingly, see controllers/Search.js's own header comment
route.get('/search', Auth, search)

module.exports = route
