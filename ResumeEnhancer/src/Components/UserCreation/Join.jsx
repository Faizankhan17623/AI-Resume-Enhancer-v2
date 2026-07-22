import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { setSignupData } from '../../Slices/authSlice'
import { SendTheOtp } from '../../Services/operations/Auth'
import { OAuth } from '../../Services/Apis/UserApi'
import CountryCode from '../../utils/CountryCode.json'

// the input style used across every form sir
const inputClass = "w-full rounded-xl bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
const errorClass = "mt-1 text-xs text-pink-200"

const Join = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector((state) => state.auth)

  const onSubmit = (data) => {
    // park the form data sir — the OTP screen finishes the creation with it
    dispatch(setSignupData(data))
    dispatch(SendTheOtp(data.email, navigate))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Sign up | Resumify</title>
      </Helmet>
      <Navbar />

      <PageTransition className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-start justify-between gap-10">

        {/* Left Side - Form Area */}
        <div className="w-full lg:w-[50%] flex flex-col items-center">

          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-richblack-5 tracking-tight">
              Create <span className="italic text-warm-200">account</span>
            </h1>
            <p className="mt-2 text-richblack-200 text-base">
              Your resume deserves better &mdash; <span className="text-blue-50 font-medium">5 free AI reviews</span>
            </p>
          </div>

          {/* Form Container */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-4">

            {/* Name Row */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className={labelClass}>First Name</label>
                <input
                  type="text"
                  placeholder="Faizan"
                  className={inputClass}
                  {...register("firstName", { required: "First name is required" })}
                />
                {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
              </div>
              <div className="w-1/2">
                <label className={labelClass}>Last Name</label>
                <input
                  type="text"
                  placeholder="Khan"
                  className={inputClass}
                  {...register("lastName", { required: "Last name is required" })}
                />
                {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
              </div>
            </div>

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

            {/* Phone Row */}
            <div className="flex gap-4">
              <div className="w-[38%]">
                <label className={labelClass}>Code</label>
                {/* the country-code dropdown sir — list lives in utils/CountryCode.json */}
                <select
                  defaultValue="+91"
                  className={`${inputClass} cursor-pointer appearance-none`}
                  {...register("Code", { required: "Required" })}
                >
                  {CountryCode.map((item, index) => (
                    <option key={index} value={item.code} className="bg-richblack-800 text-richblack-5">
                      {item.code} — {item.country}
                    </option>
                  ))}
                </select>
                {errors.Code && <p className={errorClass}>{errors.Code.message}</p>}
              </div>
              <div className="w-[62%]">
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  className={inputClass}
                  {...register("number", {
                    required: "Phone number is required",
                    pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit number" }
                  })}
                />
                {errors.number && <p className={errorClass}>{errors.number.message}</p>}
              </div>
            </div>

            {/* Password Row */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className={labelClass}>Password</label>
                <PasswordInput
                  inputClass={inputClass}
                  register={register}
                  name="password"
                  validation={{
                    required: "Password is required",
                    minLength: { value: 8, message: "Minimum 8 characters" }
                  }}
                />
                {errors.password && <p className={errorClass}>{errors.password.message}</p>}
              </div>
              <div className="w-1/2">
                <label className={labelClass}>Confirm Password</label>
                <PasswordInput
                  inputClass={inputClass}
                  register={register}
                  name="confirmpassword"
                  validation={{
                    required: "Please confirm the password",
                    validate: (value) => value === watch("password") || "Passwords do not match"
                  }}
                />
                {errors.confirmpassword && <p className={errorClass}>{errors.confirmpassword.message}</p>}
              </div>
            </div>

            <IconBtn
              type="submit"
              text={loading ? "Sending OTP..." : "Get OTP"}
              disabled={loading}
              customClasses="w-full justify-center mt-2"
            />

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

            <p className="text-center text-sm text-richblack-300">
              Already have an account?{' '}
              <Link to="/Login" className="text-yellow-50 font-semibold hover:underline">Log in</Link>
            </p>
          </form>
        </div>

        {/* Right Side - the pitch sir */}
        <div className="hidden lg:flex w-[45%] justify-center items-start pt-16">
          <div className="rounded-2xl bg-richblack-800 border border-richblack-700 p-8 max-w-md">
            <h3 className="text-richblack-5 font-bold text-xl mb-4">What you get free</h3>
            <ul className="space-y-3 text-sm text-richblack-200">
              <li className="flex gap-3"><span className="text-caribgreen-100">✓</span> 5 AI-powered ATS reviews</li>
              <li className="flex gap-3"><span className="text-caribgreen-100">✓</span> Honest score with category breakdown</li>
              <li className="flex gap-3"><span className="text-caribgreen-100">✓</span> Top 3 before/after resume fixes</li>
              <li className="flex gap-3"><span className="text-caribgreen-100">✓</span> AI resume coach chat, 60 messages per chat</li>
            </ul>
            <div className="mt-6 w-full h-1 bg-gradient-to-r from-yellow-50 via-caribgreen-100 to-blue-100 rounded-full" />
          </div>
        </div>
      </PageTransition>
    </div>
  )
}

export default Join
