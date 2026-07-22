import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { LoginUser } from '../../Services/operations/Auth'
// Google OAuth temporarily disabled sir — see the commented button below
// import { OAuth } from '../../Services/Apis/UserApi'

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

          {/* Google OAuth temporarily disabled sir — Cloud console credentials not set up yet.
              Re-enable by uncommenting this block + the OAuth import above.
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-richblack-700" />
            <span className="text-xs text-richblack-400">or</span>
            <div className="flex-1 h-px bg-richblack-700" />
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = OAuth.google }}
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
          */}

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
