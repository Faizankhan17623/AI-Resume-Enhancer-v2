// imported into the auto-generated Workbox service worker via vite.config.js's
// workbox.importScripts sir — real Web Push handling, kept in its own file rather than added to
// vite.config.js directly since Workbox's generateSW strategy writes the main sw.js itself and
// doesn't let app code inject listeners into it any other way.

self.addEventListener('push', (event) => {
  let data = { title: 'Resumify', body: '' }
  try {
    data = event.data ? event.data.json() : data
  } catch {
    // a non-JSON push body would otherwise throw and silently drop the notification sir
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Resumify', {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url || '/Dashboard' },
    })
  )
})

// clicking the OS notification sir — focuses an already-open Resumify tab if one exists,
// otherwise opens a new one at the notification's own link
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/Dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
