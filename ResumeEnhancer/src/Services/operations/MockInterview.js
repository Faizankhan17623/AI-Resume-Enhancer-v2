import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setAllSessions, setCurrentSession, setLoading, setScoring } from '../../Slices/mockInterviewSlice.js'
import { MockInterviewData } from '../Apis/MockInterviewApi.js'
import { featureDisabledMessage } from '../../utils/istTime.js'

const { start, allsessions, singlesession, answer, deletesession } = MockInterviewData

// start a new mock interview session sir — resume PDF + JD, costs one credit, ProMax only
export function StartMockInterview(pdfFile, jd, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Preparing your mock interview...")
        try {
            const formData = new FormData()
            formData.append("PDf", pdfFile)
            formData.append("jd", jd)

            const response = await apiConnector("POST", start, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Mock interview started")
            dispatch(GetAllMockInterviews(token))
            if (navigate) navigate(`/Dashboard/Mock-Interview/${response.data.sessionId}`)
        } catch (error) {
            logApiError("Error starting the mock interview", error)
            const message = error?.response?.status === 503
                ? featureDisabledMessage(error.response.data, "Could not start the mock interview")
                : (error?.response?.data?.message || "Could not start the mock interview")
            toast.error(message)
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetAllMockInterviews(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", allsessions, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllSessions(response.data.sessions))
        } catch (error) {
            logApiError("Error fetching the mock interview sessions", error)
        }
    }
}

export function GetSingleMockInterview(sessionId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${singlesession}/${sessionId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentSession(response.data.session))
        } catch (error) {
            logApiError("Error fetching the mock interview session", error)
            toast.error(error?.response?.data?.message || "Could not load the mock interview session")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// submit an answer to the current open question sir — scores it and either returns the next
// question or marks the session completed
export function AnswerMockInterview(sessionId, userAnswer, token, currentSession) {
    return async (dispatch) => {
        dispatch(setScoring(true))
        try {
            const response = await apiConnector("POST", `${answer}/${sessionId}/answer`, { answer: userAnswer }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            const { scoredTurn, status, nextTurn } = response.data
            const turns = [...currentSession.turns]
            turns[turns.length - 1] = { ...turns[turns.length - 1], ...scoredTurn }
            if (nextTurn) turns.push(nextTurn)

            dispatch(setCurrentSession({ ...currentSession, status, turns }))
        } catch (error) {
            logApiError("Error scoring the answer", error)
            toast.error(error?.response?.data?.message || "Could not score the answer")
        } finally {
            dispatch(setScoring(false))
        }
    }
}

// navigate is only ever passed by the caller when the deleted sessionId IS the currently-open
// session sir (see MockInterview.jsx handleDelete) — so it doubles here as the "was this the
// open session" flag. Deleting a different session from the sidebar should just drop it from
// the list and leave whatever's currently open alone, not clear it out from under the user.
export function DeleteMockInterview(sessionId, token, navigate) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting the session...")
        try {
            const response = await apiConnector("DELETE", `${deletesession}/${sessionId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Session deleted")
            dispatch(GetAllMockInterviews(token))
            if (navigate) {
                dispatch(setCurrentSession(null))
                navigate("/Dashboard/Mock-Interview")
            }
        } catch (error) {
            logApiError("Error deleting the mock interview session", error)
            toast.error(error?.response?.data?.message || "Could not delete the session")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
