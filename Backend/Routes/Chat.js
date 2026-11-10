const express = require('express')
const route = express.Router()
const {Auth, isUser} = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { validate } = require('../Middlewares/Validate.js')
const { createChatSchema, sendChatMessageSchema } = require('../Validation/schemas.js')
const {
    createChat,
    sendMessage,
    getChats,
    getChat,
    deleteChat
} = require('../controllers/Chat.js')

// everything about chatting with the AI lives here sir — isUser blocks Admin/Support,
// this is a product feature, strictly User-only

// both of these hit Groq sir so they get the AI rate limit. express-fileupload (index.js) runs
// before this, so req.body.jd is already a plain string by the time validate() checks it —
// createChat's PDF file itself is still checked separately via validatePdfUpload in the controller
route.post('/chat',aiLimiter,Auth,isUser,validate({ body: createChatSchema }),createChat)
route.post('/chat/:chatId/message',aiLimiter,Auth,isUser,validate({ body: sendChatMessageSchema }),sendMessage)
route.get('/chat',Auth,isUser,getChats)
route.get('/chat/:chatId',Auth,isUser,getChat)
route.delete('/chat/:chatId',Auth,isUser,deleteChat)

module.exports = route
