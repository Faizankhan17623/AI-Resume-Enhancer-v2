import toast from 'react-hot-toast'
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setNotifications, setUnreadCount, setLoading, markOneReadLocal, markAllReadLocal } from '../../Slices/notificationSlice.js'
import { Notifications } from '../Apis/UserApi.js'
import { subscribeToPush, unsubscribeFromPushLocally, getExistingPushSubscription, isPushSupported } from '../../utils/webPush.js'

const { list, unreadcount, readall, markread, pushpublickey, pushsubscribe, pushunsubscribe } = Notifications

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

// ---------------------------------------------------------------------------
// real Web Push sir — see utils/webPush.js for the browser-side subscribe/unsubscribe
// mechanics, utils/WebPush.js (Backend) for the send side
// ---------------------------------------------------------------------------

// on Account.jsx mount sir — tells the toggle whether THIS browser already has an active
// subscription, independent of any notify* preference (a user could have push permission
// granted on their phone but not this laptop)
export function GetPushSubscriptionStatus() {
    return async () => {
        if (!isPushSupported()) return false
        try {
            const sub = await getExistingPushSubscription()
            return !!sub
        } catch {
            return false
        }
    }
}

export function EnablePushNotifications(token, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
        try {
            const keyResponse = await apiConnector("GET", pushpublickey)
            if (!keyResponse.data.success) throw new Error(keyResponse.data.message)

            const subscription = await subscribeToPush(keyResponse.data.publicKey)

            const response = await apiConnector("POST", pushsubscribe, {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userAgent: navigator.userAgent,
            }, {
                Authorization: `Bearer ${token}`
            })
            if (!response.data.success) throw new Error(response.data.message)

            toast.success("Push notifications enabled on this device")
            return true
        } catch (error) {
            logApiError("Error enabling push notifications", error)
            toast.error(error?.message || error?.response?.data?.message || "Could not enable push notifications")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}

export function DisablePushNotifications(token, onLoadingChange) {
    return async () => {
        onLoadingChange?.(true)
        try {
            const subscription = await unsubscribeFromPushLocally()
            if (subscription?.endpoint) {
                await apiConnector("POST", pushunsubscribe, { endpoint: subscription.endpoint }, {
                    Authorization: `Bearer ${token}`
                })
            }
            toast.success("Push notifications turned off on this device")
            return true
        } catch (error) {
            logApiError("Error disabling push notifications", error)
            toast.error("Could not turn off push notifications")
            return false
        } finally {
            onLoadingChange?.(false)
        }
    }
}
