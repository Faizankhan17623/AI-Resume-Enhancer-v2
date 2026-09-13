import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
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

        {state.status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${state.action === 'deny' ? 'bg-pink-700/30 border-pink-700' : 'bg-caribgreen-700/30 border-caribgreen-700'}`}>
              {state.action === 'deny' ? <FaTimes className="text-pink-100 text-xl" /> : <FaCheck className="text-caribgreen-25 text-xl" />}
            </div>
            <h1 className="font-display text-2xl text-richblack-5">
              {state.action === 'deny' ? 'Account being secured' : 'Thanks for confirming'}
            </h1>
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
