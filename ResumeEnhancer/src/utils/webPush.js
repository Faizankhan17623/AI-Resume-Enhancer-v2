// browser-side half of real Web Push sir — the backend counterpart is utils/WebPush.js.
// PushManager.subscribe() needs the VAPID public key as a Uint8Array, not the base64url string
// the server hands back, so this conversion is the one genuinely fiddly part of wiring this up.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// returns the active subscription for this browser, or null if never subscribed sir
export const getExistingPushSubscription = async () => {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

// the actual opt-in flow sir: request OS permission, then ask the browser to create a
// subscription against our VAPID public key. Throws on denial/failure — caller (Account.jsx)
// is responsible for the toast.
export const subscribeToPush = async (publicKey) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  return subscription.toJSON()
}

export const unsubscribeFromPushLocally = async () => {
  const subscription = await getExistingPushSubscription()
  if (subscription) await subscription.unsubscribe()
  return subscription?.toJSON()
}
