import BASE_URL from '../../utils/backendUrl'

export const ChatData = {
    createchat: BASE_URL + "/chat",
    allchats: BASE_URL + "/chat",
    singlechat: BASE_URL + "/chat",               // + /:chatId
    sendmessage: BASE_URL + "/chat",              // + /:chatId/message
    deletechat: BASE_URL + "/chat"                // + /:chatId
}
