import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setNotifications, setUnreadCount, setLoading, markOneReadLocal, markAllReadLocal } from '../../Slices/notificationSlice.js'
import { Notifications } from '../Apis/UserApi.js'

const { list, unreadcount, readall, markread } = Notifications

// the bell dropdown's full list sir, called when the dropdown opens
export function GetNotifications(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", list, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setNotifications(response.data.notifications))
            dispatch(setUnreadCount(response.data.unreadCount))
        } catch (error) {
            logApiError("Error fetching notifications", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// cheap poll target sir — the navbar calls this on an interval to keep the badge fresh
// without pulling the full list every time
export function GetUnreadCount(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", unreadcount, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) return
            dispatch(setUnreadCount(response.data.unreadCount))
        } catch (error) {
            logApiError("Error fetching unread count", error)
        }
    }
}

export function MarkNotificationRead(notificationId, token) {
    return async (dispatch) => {
        dispatch(markOneReadLocal(notificationId))
        try {
            const response = await apiConnector("PATCH", `${markread}/${notificationId}/read`, null, {
                Authorization: `Bearer ${token}`
            })
            if (!response.data.success) throw new Error(response.data.message)
        } catch (error) {
            logApiError("Error marking notification read", error)
        }
    }
}

export function MarkAllNotificationsRead(token) {
    return async (dispatch) => {
        dispatch(markAllReadLocal())
        try {
            const response = await apiConnector("PATCH", readall, null, {
                Authorization: `Bearer ${token}`
            })
            if (!response.data.success) throw new Error(response.data.message)
        } catch (error) {
            logApiError("Error marking all notifications read", error)
        }
    }
}
