// remembers HOW this browser last logged in sir (email form, Google or GitHub) so the login page
// can mark that button with a "Last used" badge. Per-browser on purpose (localStorage): the page
// has to know before anyone has authenticated, so it can't come from the server. It stores only
// the method name — never a token, email or any account data.
const KEY = 'resumifyLastLoginMethod'

export const LOGIN_METHODS = ['email', 'google', 'github']

// reads can throw (private windows, blocked storage) sir — fall back to "no badge"
export const getLastLoginMethod = () => {
  try {
    const value = localStorage.getItem(KEY)
    return LOGIN_METHODS.includes(value) ? value : null
  } catch {
    return null
  }
}

// only known method names are stored sir — the OAuth provider name comes from a URL query
// param (see Login/OAuthComplete.jsx), so anything unexpected is ignored rather than saved
export const rememberLoginMethod = (method) => {
  if (!LOGIN_METHODS.includes(method)) return
  try {
    localStorage.setItem(KEY, method)
  } catch {
    // storage unavailable — the badge just won't show next time
  }
}
