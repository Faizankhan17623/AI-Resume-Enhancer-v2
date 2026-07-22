import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { setToken, setUser, setLogin } from '../../Slices/authSlice'
import { apiConnector } from '../../Services/apiConnector'
import { OAuth } from '../../Services/Apis/UserApi'

// landing page for the Google OAuth redirect sir — the backend's GET /auth/google/callback
// sends the browser here with only a short-lived, single-use ?code (never the real JWT — a
// token in the URL would sit in browser history and hosting/proxy access logs). This page's
// only job is to immediately trade that code for the real token via POST, in the response
// body, then store it exactly like LoginUser already does.
const OAuthComplete = () => {
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    const oauthError = searchParams.get('oauthError')

    if (oauthError) {
      toast.error(oauthError)
      navigate('/Login', { replace: true })
      return
    }

    if (!code) {
      navigate('/Login', { replace: true })
      return
    }

    let alive = true
    apiConnector("POST", OAuth.exchange, { code })
      .then((response) => {
        if (!alive) return
        if (!response.data.success) throw new Error(response.data.message)

        const { token, user } = response.data

        dispatch(setToken(token))
        dispatch(setUser(user))
        dispatch(setLogin(true))
        localStorage.setItem('token', JSON.stringify(token))
        localStorage.setItem('user', JSON.stringify(user))

        toast.success(`Welcome ${user?.firstName || ''}`)
        navigate('/Dashboard', { replace: true })
      })
      .catch((error) => {
        if (!alive) return
        toast.error(error?.response?.data?.message || 'Could not complete Google sign-in')
        navigate('/Login', { replace: true })
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-richblack-900 flex items-center justify-center">
      <p className="text-richblack-300 text-sm">Finishing sign-in...</p>
    </div>
  )
}

export default OAuthComplete
