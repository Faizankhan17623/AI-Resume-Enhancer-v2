import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRegisterSW } from 'virtual:pwa-register/react'

// silent — no user-visible mount, just wires the service worker lifecycle sir. Kept as its own
// component rather than inline in main.jsx so the virtual:pwa-register import only ever runs in
// the browser build (this file has no server-side/test usage to worry about).
const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">A new version of Resumify is available.</span>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              updateServiceWorker(true)
            }}
            className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-full bg-yellow-50 text-richblack-900 cursor-pointer hover:brightness-110"
          >
            Reload
          </button>
        </div>
      ),
      { duration: Infinity, id: 'pwa-update' }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh])

  return null
}

export default PWAUpdatePrompt
