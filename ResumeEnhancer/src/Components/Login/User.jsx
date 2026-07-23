import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { LoginUser } from '../../Services/operations/Auth'
import { OAuth } from '../../Services/Apis/UserApi'
import { startOAuth } from '../../utils/oauthProviders'

const inputClass = "w-full rounded-xl bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
const errorClass = "mt-1 text-xs text-pink-200"

const User = () => {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector((state) => state.auth)

  const onSubmit = (data) => {
    dispatch(LoginUser(data.email, data.password, navigate))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Log in | Resumify</title>
      </Helmet>
      <Navbar />

      <PageTransition className="w-full max-w-md mx-auto px-6 py-16">

        {/* Welcome Header */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-richblack-5 tracking-tight">
            Welcome <span className="italic text-warm-200">back</span>
          </h1>
          <p className="mt-2 text-richblack-200 text-base">
            Your score is waiting &mdash; <span className="text-blue-50 font-medium">let's push it higher</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Email */}
          <div>
            <label className={labelClass}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              className={inputClass}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
              })}
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass + " mb-0"}>Password</label>
              <Link to="/Forgot-Password" className="text-xs font-medium text-yellow-50 hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              inputClass={inputClass}
              register={register}
              name="password"
              validation={{ required: "Password is required" }}
            />
            {errors.password && <p className={errorClass}>{errors.password.message}</p>}
          </div>

          <IconBtn
            type="submit"
            text={loading ? "Logging in..." : "Log in"}
            disabled={loading}
            customClasses="w-full justify-center"
          />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-richblack-700" />
            <span className="text-xs text-richblack-400">or</span>
            <div className="flex-1 h-px bg-richblack-700" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => startOAuth('google', OAuth.google)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-richblack-5 border border-richblack-600 rounded-full hover:bg-richblack-800 transition-all duration-200 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
                <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => startOAuth('facebook', OAuth.facebook)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-richblack-5 border border-richblack-600 rounded-full hover:bg-richblack-800 transition-all duration-200 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.02c0-2.26 1.35-3.51 3.41-3.51.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.41V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9Z"/>
              </svg>
              Continue with Facebook
            </button>

            <button
              type="button"
              onClick={() => startOAuth('github', OAuth.github)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-richblack-5 border border-richblack-600 rounded-full hover:bg-richblack-800 transition-all duration-200 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/>
              </svg>
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={() => startOAuth('linkedin', OAuth.linkedin)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-richblack-5 border border-richblack-600 rounded-full hover:bg-richblack-800 transition-all duration-200 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.93v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/>
              </svg>
              Continue with LinkedIn
            </button>
          </div>

          <p className="text-center text-sm text-richblack-300">
            New here?{' '}
            <Link to="/Signup" className="text-yellow-50 font-semibold hover:underline">Create an account</Link>
          </p>
        </form>
      </PageTransition>
    </div>
  )
}

export default User
