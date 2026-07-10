const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const ChatData = {
    createchat: BASE_URL + "/chat",
    allchats: BASE_URL + "/chat",
    singlechat: BASE_URL + "/chat",               // + /:chatId
    sendmessage: BASE_URL + "/chat",              // + /:chatId/message
    deletechat: BASE_URL + "/chat"                // + /:chatId
}
