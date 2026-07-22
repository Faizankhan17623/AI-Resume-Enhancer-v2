const express = require('express')
const route = express.Router()
const {Auth, isUser} = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const {
    createChat,
    sendMessage,
    getChats,
    getChat,
    deleteChat
} = require('../controllers/Chat.js')

// everything about chatting with the AI lives here sir — isUser blocks Admin/Support,
// this is a product feature, strictly User-only

// both of these hit Groq sir so they get the AI rate limit
route.post('/chat',aiLimiter,Auth,isUser,createChat)
route.post('/chat/:chatId/message',aiLimiter,Auth,isUser,sendMessage)
route.get('/chat',Auth,isUser,getChats)
route.get('/chat/:chatId',Auth,isUser,getChat)
route.delete('/chat/:chatId',Auth,isUser,deleteChat)

module.exports = route
