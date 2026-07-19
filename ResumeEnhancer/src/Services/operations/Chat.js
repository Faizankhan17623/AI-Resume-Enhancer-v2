import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setAllChats, setCurrentChat, setLoading, setReplying, appendStreamingReply, resetStreamingReply } from '../../Slices/chatSlice.js'
import { ChatData } from '../Apis/ChatApi.js'

const { createchat, allchats, singlechat, sendmessage, deletechat } = ChatData

// start a new chat with the resume PDF + JD sir — costs one credit
export function CreateChat(pdfFile, jd, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Creating your chat...")
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)

            const response = await apiConnector("POST", createchat, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Chat created")
            dispatch(GetAllChats(token))
            if (navigate) navigate(`/Dashboard/Chat/${response.data.chatId}`)
        } catch (error) {
            logApiError("Error creating the chat", error)
            toast.error(error?.response?.data?.message || "Could not create the chat")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetAllChats(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", allchats, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllChats(response.data.chats))
        } catch (error) {
            logApiError("Error fetching the chats", error)
        }
    }
}

export function GetSingleChat(chatId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${singlechat}/${chatId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentChat(response.data.chat))
        } catch (error) {
            logApiError("Error fetching the chat", error)
            toast.error(error?.response?.data?.message || "Could not load the chat")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// send one message sir — the user bubble shows instantly, then the AI reply streams in
// token by token via fetch()+ReadableStream (axios can't consume a live stream, and
// EventSource can't carry our Authorization header, so this is a plain fetch call)
export function SendMessage(chatId, message, token, currentChat) {
    return async (dispatch) => {
        dispatch(setReplying(true))
        dispatch(resetStreamingReply())

        // optimistic user bubble sir — everything after this reads from THIS snapshot,
        // never the stale `currentChat` argument, so the reply always lands after it
        const withUserBubble = {
            ...currentChat,
            messages: [...currentChat.messages, { role: 'user', content: message }]
        }
        dispatch(setCurrentChat(withUserBubble))

        try {
            const response = await fetch(`${sendmessage}/${chatId}/message`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            })

            if (!response.ok || !response.body) {
                const failure = await response.json().catch(() => null)
                throw new Error(failure?.message || 'Could not send the message')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let fullReply = ''
            let serverError = null

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() // sir — the last split piece may be a half-received line, keep it for next time

                for (const line of lines) {
                    if (!line.trim()) continue
                    const event = JSON.parse(line)

                    if (event.type === 'chunk') {
                        fullReply += event.content
                        dispatch(appendStreamingReply(event.content))
                    } else if (event.type === 'error') {
                        serverError = event.message
                    }
                    // 'done' needs no handling sir — completion is detected by the reader finishing
                }
            }

            if (serverError || !fullReply) {
                throw new Error(serverError || 'The AI returned an empty response, please try again')
            }

            // fold the finished reply into the permanent message list sir
            dispatch(setCurrentChat({
                ...withUserBubble,
                messages: [...withUserBubble.messages, { role: 'assistant', content: fullReply }]
            }))
        } catch (error) {
            logApiError("Error sending the message", error)
            toast.error(error?.message || "Could not send the message")
            // roll the optimistic bubble back sir
            dispatch(setCurrentChat(currentChat))
        } finally {
            dispatch(resetStreamingReply())
            dispatch(setReplying(false))
        }
    }
}

export function DeleteChat(chatId, token, navigate) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting the chat...")
        try {
            const response = await apiConnector("DELETE", `${deletechat}/${chatId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Chat deleted")
            dispatch(setCurrentChat(null))
            dispatch(GetAllChats(token))
            if (navigate) navigate("/Dashboard/Chats")
        } catch (error) {
            logApiError("Error deleting the chat", error)
            toast.error(error?.response?.data?.message || "Could not delete the chat")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
