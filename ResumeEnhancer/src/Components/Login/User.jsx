import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { LoginUser } from '../../Services/operations/Auth'

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
