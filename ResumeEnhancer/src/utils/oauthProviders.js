import toast from 'react-hot-toast'

export const PROVIDER_READY = {
  google: true,
  github: true,
}

// App.jsx already pings the backend awake on every page load sir, but that's a best-effort
// head start — someone clicking an OAuth button within milliseconds of the page loading
// (or on a very slow connection) might still race a still-sleeping Render free-tier backend.
// One more fire-and-forget ping right at click time costs nothing and closes that gap —
// the actual OAuth redirect below doesn't wait on it.
const pingBackendAwake = () => {
  const backendUrl = import.meta.env.VITE_MAIN_BACKEND_URL
  if (!backendUrl) return
  try {
    fetch(new URL(backendUrl).origin, { method: 'GET' }).catch(() => {})
  } catch {
    // malformed env URL sir — nothing to wake
  }
}

export const startOAuth = (provider, url) => {
  if (!PROVIDER_READY[provider]) {
    toast.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in isn't set up yet, please try another method`)
    return
  }
  pingBackendAwake()
  window.location.href = url
}
