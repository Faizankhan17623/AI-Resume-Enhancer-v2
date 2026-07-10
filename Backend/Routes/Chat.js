const express = require('express')
const route = express.Router()
const {Auth} = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    createChat,
    sendMessage,
    getChats,
    getChat,
    deleteChat
} = require('../controllers/Chat.js')

// everything about chatting with the AI lives here sir

// both of these hit Groq sir so they get the AI rate limit
route.post('/chat',aiLimiter,Auth,createChat)
route.post('/chat/:chatId/message',aiLimiter,Auth,sendMessage)
route.get('/chat',Auth,getChats)
route.get('/chat/:chatId',Auth,getChat)
route.delete('/chat/:chatId',Auth,deleteChat)

module.exports = route
