const mongoose = require('mongoose')
const { PDFParse } = require('pdf-parse')
const Grok = require('groq-sdk')
const User = require('../Models/User')
const Chat = require('../Models/Chat')

const { consumeCredit, getUserPlan } = require('../utils/Plans')
const { buildChatSystemPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { updateStreak } = require('../utils/Streak')
const { recordFeatureUse } = require('../utils/FeatureUsage')
const { AI_MODEL } = require('../utils/AiModel')

const grok = new Grok({ apiKey: process.env.GROK_API_KEY })

// fallback for how many past messages we replay sir — the real number comes from the user's plan
const CONTEXT_WINDOW = 10

// POST /chat — start a new chat with the resume PDF + JD sir
exports.createChat = async (req, res) => {
    try {
        const id = req?.User.id

        const PDf = req.files?.PDf
        // not a pdf file error sir
        if (!PDf) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded file must be a PDF or Word document',
            })
        }

        const jd = req.body.jd
        // not case sir
        if (!jd) {
            return res.status(400).json({
                success: false,
                message: 'Job Description is required',
            })
        }

        // plan-aware credit check sir — each new chat costs one credit
        const spend = await consumeCredit(id)

        if (!spend.ok) {
            return res.status(403).json({
                success: false,
                message: spend.message
            })
        }

        const parser = new PDFParse({ data: PDf.data })
        const result = await parser.getText()

        if (!result?.text) {
            return res.status(400).json({
                success: false,
                message: 'error in getting the result from the pdf',
            })
        }

        // first 60 chars of the JD make a decent sidebar title sir
        const title = jd.trim().slice(0, 60) || 'New Chat'

        const chat = await Chat.create({
            user: id,
            title,
            resumeText: result.text,
            jd,
            messages: []
        })

        // keep the user's chat list in sync sir
        await User.findByIdAndUpdate(id, { $push: { Newchat: chat._id } })

        return res.status(201).json({
            success: true,
            message: 'Chat created successfully',
            chatId: chat._id,
            title: chat.title
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the chat',
        })
    }
}

// POST /chat/:chatId/message — send a message and get the AI reply sir
exports.sendMessage = async (req, res) => {
    try {
        const id = req?.User.id
        const { chatId } = req.params
        const message = req.body.message

        // bad id should be a clean 400, not a crash into the 500 sir
        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        // not case sir
        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message is required',
            })
        }

        // filtering by user too so nobody can talk in someone else's chat sir
        const chat = await Chat.findOne({ _id: chatId, user: id })

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        // cap the chat length by the user's plan sir — Basic 60, Pro 200, ProMax 500
        const plan = await getUserPlan(id)
        if (plan && plan.maxMessagesPerChat !== null && chat.messages.length >= plan.maxMessagesPerChat) {
            return res.status(403).json({
                success: false,
                message: 'This chat is full for your plan, please start a new chat or upgrade your plan',
            })
        }

        // plan-aware system prompt sir — Basic coaches light, Pro rewrites deep, ProMax is the full career coach
        // it also carries the resume + JD so the user never re-uploads
        const contextWindow = plan?.contextWindow || CONTEXT_WINDOW
        const Messages = [
            {
                role: 'system',
                content: buildChatSystemPrompt(plan?.key, chat.resumeText, chat.jd)
            },
            // replay only the recent turns to keep the token cost sane sir — bigger plans remember more
            ...chat.messages.slice(-contextWindow).map((m) => ({
                role: m.role,
                content: m.content
            })),
            {
                role: 'user',
                content: message.trim()
            }
        ]

        // streamed sir — chunked text/plain response, one JSON-per-line so the frontend
        // can tell a content token apart from the final status without any SSE ceremony
        // (a plain fetch()+ReadableStream reads this fine, and it still carries our
        // Authorization: Bearer header, which EventSource cannot send)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('X-Accel-Buffering', 'no') // sir — stops nginx-style proxies from buffering the whole reply before forwarding it
        res.flushHeaders?.()

        const writeLine = (obj) => res.write(JSON.stringify(obj) + '\n')

        const t0 = Date.now()
        let raw = ''
        let usage = null
        let streamErr = null
        try {
            const stream = await grok.chat.completions.create({
                messages: Messages,
                "model": AI_MODEL,
                "temperature": 0.5,
                stream: true,
            })

            // a <think>...</think> reasoning block must never reach the client sir — but gpt-oss
            // never emits one in content, so the moment the reply clearly does NOT open with
            // <think> we flush and stream normally instead of buffering the whole answer
            let streaming = false      // true once we know we're past any think block
            let inThink = false        // true while buffering an actual <think> block
            let pending = ''

            for await (const chunk of stream) {
                const delta = chunk?.choices?.[0]?.delta?.content
                if (chunk?.usage) usage = chunk.usage // groq sends usage on the final chunk sir
                if (!delta) continue

                if (streaming) {
                    raw += delta
                    writeLine({ type: 'chunk', content: delta })
                    continue
                }

                pending += delta
                if (inThink) {
                    if (pending.includes('</think>')) {
                        const after = pending.split('</think>').pop()
                        streaming = true
                        if (after) {
                            raw += after
                            writeLine({ type: 'chunk', content: after })
                        }
                    }
                    continue
                }

                const lead = pending.trimStart()
                if (lead.startsWith('<think>')) {
                    inThink = true
                } else if (lead.length >= 7 || (lead && !'<think>'.startsWith(lead))) {
                    // definitely not a think block sir — release the buffer and stream live
                    streaming = true
                    raw += pending
                    writeLine({ type: 'chunk', content: pending })
                }
                // else: too few chars to tell yet sir — keep buffering a moment longer
            }

            // stream ended while we were still holding the buffer sir — whatever is pending IS the reply
            if (!streaming && !inThink && pending) {
                raw = pending
                writeLine({ type: 'chunk', content: pending })
            }

            raw = raw.trim()
            logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: AI_MODEL, usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            streamErr = aiErr
            logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: AI_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
        }

        // not case sir — the stream broke or produced nothing, don't persist a half-written reply
        if (streamErr || !raw) {
            writeLine({ type: 'error', message: 'The AI returned an empty response, please try again' })
            return res.end()
        }

        // save both sides of the turn only now that we know the reply is complete sir
        chat.messages.push({ role: 'user', content: message.trim() })
        chat.messages.push({ role: 'assistant', content: raw })
        await chat.save()

        // fire-and-forget sir — a streak failure must never break the chat response
        updateStreak(id)
        recordFeatureUse(id)

        writeLine({ type: 'done' })
        return res.end()
    } catch (error) {
        console.log(error)
        console.log(error.message)
        // headers may already be sent once streaming has started sir — fall back to a write+end
        if (res.headersSent) {
            res.write(JSON.stringify({ type: 'error', message: 'Something went wrong while sending the message' }) + '\n')
            return res.end()
        }
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending the message',
        })
    }
}

// GET /chat — the user's chat list for the sidebar sir
exports.getChats = async (req, res) => {
    try {
        const id = req?.User.id

        const chats = await Chat.find({ user: id })
            .select('title updatedAt createdAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            chats
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the chats',
        })
    }
}

// GET /chat/:chatId — full message history of one chat sir
exports.getChat = async (req, res) => {
    try {
        const id = req?.User.id
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        // resumeText stays server-side, no need to ship it to the frontend sir
        const chat = await Chat.findOne({ _id: chatId, user: id })
            .select('title jd messages createdAt updatedAt')

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        return res.status(200).json({
            success: true,
            chat
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the chat',
        })
    }
}

// DELETE /chat/:chatId — remove a chat and unlink it from the user sir
exports.deleteChat = async (req, res) => {
    try {
        const id = req?.User.id
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        const chat = await Chat.findOneAndDelete({ _id: chatId, user: id })

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        // pull the reference out of the user's chat list too sir
        await User.findByIdAndUpdate(id, { $pull: { Newchat: chat._id } })

        return res.status(200).json({
            success: true,
            message: 'Chat deleted successfully',
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the chat',
        })
    }
}
