import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the message currently shown sir — subject is '' when there isn't one (LinkedIn destination
    // never sends one, see controllers/OutreachMessage.js's buildOutreachMessagePrompt)
    subject: '',
    body: null,
    messageId: null,
    // saved list for the history view sir
    allMessages: [],
    loading: false,
    generating: false,
};

const outreachMessageSlice = createSlice({
    name: "outreachMessage",
    initialState: initialState,
    reducers: {
        setSubject(state, value) {
            state.subject = value.payload
        },
        setBody(state, value) {
            state.body = value.payload
        },
        setMessageId(state, value) {
            state.messageId = value.payload
        },
        setAllMessages(state, value) {
            state.allMessages = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setGenerating(state, value) {
            state.generating = value.payload
        }
    }
})

export const {
    setSubject, setBody, setMessageId, setAllMessages, setLoading, setGenerating
} = outreachMessageSlice.actions
export default outreachMessageSlice.reducer
