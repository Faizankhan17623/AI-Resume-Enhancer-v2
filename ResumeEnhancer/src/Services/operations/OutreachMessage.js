import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setSubject, setBody, setMessageId, setAllMessages, setLoading, setGenerating } from '../../Slices/outreachMessageSlice.js'
import { OutreachMessageData } from '../Apis/OutreachMessageApi.js'
import { featureDisabledMessage } from '../../utils/istTime.js'

const { generate, all, single } = OutreachMessageData

// upload the resume PDF + JD and get a short outreach message back sir — Pro+ feature.
// Backend always returns both subject + body (subject is '' when the AI had nothing to add
// there); the UI decides whether to show the subject field based on the chosen destination.
export function GenerateOutreachMessage(pdfFile, jd, token) {
    return async (dispatch) => {
        dispatch(setGenerating(true))
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)

            const response = await apiConnector("POST", generate, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSubject(response.data.subject || ''))
            dispatch(setBody(response.data.body))
            dispatch(setMessageId(response.data.outreachMessageId))
            toast.success("Your outreach message is ready")
        } catch (error) {
            logApiError("Error generating the outreach message", error)
            const message = error?.response?.status === 503
                ? featureDisabledMessage(error.response.data, "Could not generate the outreach message")
                : (error?.response?.data?.message || "Could not generate the outreach message")
            toast.error(message)
        } finally {
            dispatch(setGenerating(false))
        }
    }
}

export function GetAllOutreachMessages(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", all, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllMessages(response.data.messages))
        } catch (error) {
            logApiError("Error fetching the outreach messages", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetSingleOutreachMessage(outreachMessageId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${single}/${outreachMessageId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSubject(response.data.message.subject || ''))
            dispatch(setBody(response.data.message.body))
            dispatch(setMessageId(response.data.message._id))
        } catch (error) {
            logApiError("Error fetching the outreach message", error)
            toast.error(error?.response?.data?.message || "Could not load the outreach message")
        } finally {
            dispatch(setLoading(false))
        }
    }
}
