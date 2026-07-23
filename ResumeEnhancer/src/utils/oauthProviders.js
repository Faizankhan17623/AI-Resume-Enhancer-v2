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

export const startOAuth = (provider, url) => {
  if (!PROVIDER_READY[provider]) {
    toast.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in isn't set up yet, please try another method`)
    return
  }
  window.location.href = url
}
