import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the sidebar list sir
    allChats: [],
    // the open chat with its messages
    currentChat: null,
    loading: false,
    // true while the AI is typing its reply sir
    replying: false,
    // the assistant reply as it streams in, token by token sir — folded into
    // currentChat.messages and reset to '' once the stream completes
    streamingReply: ''
};

const chatSlice = createSlice({
    name: "chat",
    initialState: initialState,
    reducers: {
        setAllChats(state, value) {
            state.allChats = value.payload
        },
        setCurrentChat(state, value) {
            state.currentChat = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setReplying(state, value) {
            state.replying = value.payload
        },
        appendStreamingReply(state, value) {
            state.streamingReply += value.payload
        },
        resetStreamingReply(state) {
            state.streamingReply = ''
        }
    }
})

export const { setAllChats, setCurrentChat, setLoading, setReplying, appendStreamingReply, resetStreamingReply } = chatSlice.actions
export default chatSlice.reducer
