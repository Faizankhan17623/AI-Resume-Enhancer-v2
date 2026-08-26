import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router'
import { setToken, setUser, setLogin } from '../../Slices/authSlice'
import { apiConnector } from '../../Services/apiConnector'
import { OAuth } from '../../Services/Apis/UserApi'
import LoginStatusOverlay from './LoginStatusOverlay'

// landing page for every OAuth provider's redirect sir — the backend's GET /auth/<provider>/callback
// sends the browser here with only a short-lived, single-use ?code (never the real JWT — a
// token in the URL would sit in browser history and hosting/proxy access logs) plus a
// &provider= tag saying which one so we know which exchange endpoint to hit. This page's
// only job is to immediately trade that code for the real token via POST, in the response
// body, then store it exactly like LoginUser already does.
const OAuthComplete = () => {
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  // same status-overlay pattern as Login/User.jsx sir, replacing this page's old toast calls —
  // one shared look for "logging in" across both the password form and every OAuth provider.
  // The initial value is computed straight from the URL sir (a lazy initializer, read once at
  // mount) rather than set inside the effect below — ?oauthError= is already known synchronously
  // from the very first render, so there's no real "loading" moment for that case, and setting
  // state synchronously inside an effect body is exactly the cascading-render pattern React's own
  // hooks lint rule (react-hooks/set-state-in-effect) flags.
  const [loginStatus, setLoginStatus] = useState(() => {
    const oauthError = searchParams.get('oauthError')
    return oauthError ? { status: 'error', message: oauthError } : { status: 'loading', message: 'Finishing sign-in...' }
  })

  useEffect(() => {
    const code = searchParams.get('code')
    const provider = searchParams.get('provider') || 'google'
    const oauthError = searchParams.get('oauthError')

    if (oauthError) {
      setTimeout(() => navigate('/Login', { replace: true }), 1600)
      return
    }

    const exchangeUrl = OAuth.exchange[provider]

    if (!code || !exchangeUrl) {
      navigate('/Login', { replace: true })
      return
    }

    let alive = true
    apiConnector("POST", exchangeUrl, { code })
      .then((response) => {
        if (!alive) return
        if (!response.data.success) throw new Error(response.data.message)

        const { token, user } = response.data

        dispatch(setToken(token))
        dispatch(setUser(user))
        dispatch(setLogin(true))
        // token stays in memory only sir — same rule as the password login (see
        // Services/operations/Auth.js). The httpOnly cookie set by the exchange response is
        // the real credential; only the non-sensitive user object is cached for paint-on-reload.
        localStorage.setItem('user', JSON.stringify(user))

        setLoginStatus({ status: 'success', message: 'Login successful' })
        // each role lands on its OWN dashboard sir — same rule LoginUser uses in Services/operations/Auth.js,
        // never a shared landing page (OAuth accounts can be Admin/Support too, not just User)
        const landingPath = user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support' : '/Dashboard'
        // same brief pause as the password login sir — long enough for the checkmark to register
        setTimeout(() => navigate(landingPath, { replace: true }), 900)
      })
      .catch((error) => {
        if (!alive) return
        setLoginStatus({ status: 'error', message: error?.response?.data?.message || 'Could not complete sign-in' })
        setTimeout(() => navigate('/Login', { replace: true }), 1600)
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex items-center justify-center">
      <LoginStatusOverlay status={loginStatus.status} message={loginStatus.message} />
    </div>
  )
}

export default OAuthComplete
