import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { TestData } from '../Apis/TestApi.js'
import {
    setMyTests,
    setCurrentTest,
    setTestAttempts,
    setCurrentAttemptDetail,
    setLoading as setRecruiterLoading,
} from '../../Slices/testSlice.js'
import {
    setTestAndAttempt,
    setViolationState,
    setLoading as setAttemptLoading,
} from '../../Slices/testAttemptSlice.js'

const {
    createTest, listMyTests, getTest, updateTest, publishTest, getTestAttempts, getAttemptDetail,
    startAttempt, submitAnswers, logViolation,
} = TestData

// ---------------------------------------------------------------------------
// recruiter-side sir
// ---------------------------------------------------------------------------

export function CreateTest(testPayload, token, navigate, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", createTest, testPayload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Test created")
            // navigates back to the job's own page sir — a test always belongs to one job now,
            // there's no standalone /Recruiter/Tests/:testId view to land on anymore
            if (navigate) navigate(`/Recruiter/Jobs/${response.data.test.job}`)
        } catch (error) {
            logApiError("Error creating the test", error)
            toast.error(error?.response?.data?.message || "Could not create the test")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function GetMyTests(token) {
    return async (dispatch) => {
        dispatch(setRecruiterLoading(true))
        try {
            const response = await apiConnector("GET", listMyTests, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setMyTests(response.data.tests))
        } catch (error) {
            logApiError("Error fetching your tests", error)
            toast.error(error?.response?.data?.message || "Could not load your tests")
        } finally {
            dispatch(setRecruiterLoading(false))
        }
    }
}

export function GetTest(testId, token) {
    return async (dispatch) => {
        dispatch(setRecruiterLoading(true))
        try {
            const response = await apiConnector("GET", `${getTest}/${testId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentTest(response.data.test))
        } catch (error) {
            logApiError("Error fetching the test", error)
            toast.error(error?.response?.data?.message || "Could not load the test")
        } finally {
            dispatch(setRecruiterLoading(false))
        }
    }
}

export function UpdateTest(testId, testPayload, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("PATCH", `${updateTest}/${testId}`, testPayload, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Test updated")
            dispatch(setCurrentTest(response.data.test))
        } catch (error) {
            logApiError("Error updating the test", error)
            toast.error(error?.response?.data?.message || "Could not update the test")
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function PublishTest(testId, token, onLoadingChange) {
    return async (dispatch) => {
        onLoadingChange?.(true)
        try {
            const response = await apiConnector("POST", `${publishTest}/${testId}/publish`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Test published — share the invite link with candidates")
            dispatch(setCurrentTest(response.data.test))
            return response.data.inviteCode
        } catch (error) {
            logApiError("Error publishing the test", error)
            toast.error(error?.response?.data?.message || "Could not publish the test")
            return null
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function GetTestAttempts(testId, token) {
    return async (dispatch) => {
        dispatch(setRecruiterLoading(true))
        try {
            const response = await apiConnector("GET", `${getTestAttempts}/${testId}/attempts`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setTestAttempts(response.data.attempts))
        } catch (error) {
            logApiError("Error fetching attempts", error)
            toast.error(error?.response?.data?.message || "Could not load the attempts")
        } finally {
            dispatch(setRecruiterLoading(false))
        }
    }
}

export function GetAttemptDetail(attemptId, token) {
    return async (dispatch) => {
        dispatch(setRecruiterLoading(true))
        try {
            const response = await apiConnector("GET", `${getAttemptDetail}/${attemptId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentAttemptDetail(response.data.attempt))
        } catch (error) {
            logApiError("Error fetching attempt detail", error)
            toast.error(error?.response?.data?.message || "Could not load the attempt")
        } finally {
            dispatch(setRecruiterLoading(false))
        }
    }
}

// ---------------------------------------------------------------------------
// candidate-side sir
// ---------------------------------------------------------------------------

export function StartAttempt(inviteCode, token, navigate) {
    return async (dispatch) => {
        dispatch(setAttemptLoading(true))
        try {
            const response = await apiConnector("POST", `${startAttempt}/${inviteCode}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setTestAndAttempt({ test: response.data.test, attempt: response.data.attempt }))
        } catch (error) {
            logApiError("Error starting the test", error)
            toast.error(error?.response?.data?.message || "Could not start the test")
            if (navigate) navigate("/Dashboard")
        } finally {
            dispatch(setAttemptLoading(false))
        }
    }
}

// answersMap sir — { [questionId]: answer } from testAttemptSlice, converted to the array shape
// the backend expects
export function SubmitTestAnswers(attemptId, answersMap, token, navigate, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
        try {
            const answers = Object.entries(answersMap).map(([questionId, answer]) => ({ questionId, answer }))
            const response = await apiConnector("POST", `${submitAnswers}/${attemptId}/answers`, { answers }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            if (navigate) navigate("/Dashboard")
            return response.data
        } catch (error) {
            logApiError("Error submitting the test", error)
            toast.error(error?.response?.data?.message || "Could not submit the test")
            return null
        } finally {
            onLoadingChange?.(false)
        }
    }
}

// snapshotBlob sir — a canvas.toBlob() JPEG captured at the moment of the violation.
// Returns the response data so ProctoredTestRunner can decide whether to show a warning
// toast or the final "test ended" modal, without this thunk needing any UI concerns of its own.
export function LogViolation(attemptId, snapshotBlob, token) {
    return async (dispatch) => {
        try {
            const formData = new FormData()
            formData.append("snapshot", snapshotBlob, "violation.jpg")

            const response = await apiConnector("POST", `${logViolation}/${attemptId}/violations`, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setViolationState({ violationCount: response.data.violationCount, status: response.data.status }))
            return response.data
        } catch (error) {
            // deliberately no toast here sir — a failed violation upload (flaky network) shouldn't
            // interrupt the candidate mid-test with an error about something THEY didn't do wrong.
            // The caller still gets null back and can decide to retry silently.
            logApiError("Error logging violation", error)
            return null
        }
    }
}
