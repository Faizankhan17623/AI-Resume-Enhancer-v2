import toast from 'react-hot-toast'

// Facebook/LinkedIn apps aren't registered yet sir — flip these to true once real
// FACEBOOK_CLIENT_ID / LINKEDIN_CLIENT_ID are set in Backend/.env and the matching
// VITE_FACEBOOK_OAUTH_READY / VITE_LINKEDIN_OAUTH_READY are set to "true" in the frontend .env
export const PROVIDER_READY = {
  google: true,
  facebook: import.meta.env.VITE_FACEBOOK_OAUTH_READY === 'true',
  github: true,
  linkedin: import.meta.env.VITE_LINKEDIN_OAUTH_READY === 'true',
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
