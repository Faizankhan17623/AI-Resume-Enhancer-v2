import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaCheck, FaTimes } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import PageTransition from '../extra/PageTransition'
import { apiConnector } from '../../Services/apiConnector'
import { DeviceAlert } from '../../Services/Apis/UserApi'

// landing page for the two buttons in Backend/Templates/newDeviceAlertTemplate.js sir — the
// email links here with ?token=...&action=confirm|deny, this page's only job is to fire that
// one request and show the result. Deliberately NOT wrapped in OpenRoute: the person clicking
// this link very often has no live session at all (a device they don't control may be the one
// currently logged in), same reasoning as ResetPassword being reachable while logged out.
const DeviceAlertConfirm = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // same lazy-initializer pattern as Login/OAuthComplete.jsx sir — the invalid-link case is
  // already known synchronously from the URL at first render, so there's no real "loading"
  // moment for it; computing it here (not inside the effect below) is what keeps the effect's
  // OWN setState calls all past their first await, which is what the react-hooks/set-state-in-effect
  // rule is actually checking for.
  const [state, setState] = useState(() => {
    const token = searchParams.get('token')
    const action = searchParams.get('action')
    if (!token || !['confirm', 'deny'].includes(action)) {
      return { status: 'error', message: 'This link is invalid or incomplete.' }
    }
    return { status: 'loading', message: 'Confirming...' }
  })

  useEffect(() => {
    const token = searchParams.get('token')
    const action = searchParams.get('action')
    if (!token || !['confirm', 'deny'].includes(action)) return // already handled above

    let alive = true
    apiConnector('POST', DeviceAlert.resolve, { token, action })
      .then((res) => {
        if (!alive) return
        // per direct request sir — "No, it wasn't me" no longer shows a status message here at
        // all, it sends the user straight to the real Forgot Password page so THEY type their
        // email and request the reset themselves, same flow as anyone who forgot their password
        // normally (see Backend/services/deviceAlertService.js's own comment on why the backend
        // stopped auto-generating/sending a reset email for this action)
        if (res.data.action === 'deny') {
          navigate('/Forgot-Password')
          return
        }
        setState({ status: 'success', action: res.data.action, message: res.data.message })
      })
      .catch((error) => {
        if (!alive) return
        setState({ status: 'error', message: error?.response?.data?.message || 'This link has expired or was already used.' })
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet><title>Confirm sign-in | Resumify</title></Helmet>
      <Navbar />
      <PageTransition className="w-full max-w-md mx-auto px-6 py-20 text-center">
        {state.status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-richblack-600 border-t-yellow-50 animate-spin" />
            <p className="text-richblack-200 text-sm">{state.message}</p>
          </div>
        )}

        {/* 'confirm' is the only outcome that ever renders here sir — 'deny' redirects to
            /Forgot-Password before this ever gets a chance to show, see the effect above */}
        {state.status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 bg-caribgreen-700/30 border-caribgreen-700">
              <FaCheck className="text-caribgreen-25 text-xl" />
            </div>
            <h1 className="font-display text-2xl text-richblack-5">Thanks for confirming</h1>
            <p className="text-richblack-300 text-sm">{state.message}</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-pink-700/30 border-2 border-pink-700 flex items-center justify-center">
              <FaTimes className="text-pink-100 text-xl" />
            </div>
            <h1 className="font-display text-2xl text-richblack-5">Link no longer valid</h1>
            <p className="text-richblack-300 text-sm">{state.message}</p>
          </div>
        )}

        <p className="mt-10 text-sm text-richblack-400">
          <Link to="/Login" className="text-yellow-50 font-semibold hover:underline">Back to login</Link>
        </p>
      </PageTransition>
    </div>
  )
}

export default DeviceAlertConfirm
