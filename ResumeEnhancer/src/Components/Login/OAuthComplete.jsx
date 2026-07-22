import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { setToken, setUser, setLogin } from '../../Slices/authSlice'

// landing page for the Google OAuth redirect sir — the backend's GET /auth/google/callback
// sends the browser here with ?token&user after a successful sign-in (a real page nav, not
// XHR, so this is the only way to hand the token back to the SPA). Same redux/localStorage
// shape LoginUser already writes, then it strips the token off the address bar and leaves.
const OAuthComplete = () => {
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    const userRaw = searchParams.get('user')
    const oauthError = searchParams.get('oauthError')

    if (oauthError) {
      toast.error(oauthError)
      navigate('/Login', { replace: true })
      return
    }

    if (!token || !userRaw) {
      navigate('/Login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(userRaw)

      dispatch(setToken(token))
      dispatch(setUser(user))
      dispatch(setLogin(true))
      localStorage.setItem('token', JSON.stringify(token))
      localStorage.setItem('user', JSON.stringify(user))

      toast.success(`Welcome ${user?.firstName || ''}`)
      navigate('/Dashboard', { replace: true })
    } catch {
      toast.error('Could not complete Google sign-in')
      navigate('/Login', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex items-center justify-center">
      <p className="text-richblack-300 text-sm">Finishing sign-in...</p>
    </div>
  )
}

export default OAuthComplete
