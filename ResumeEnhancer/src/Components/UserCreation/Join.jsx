import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link, useSearchParams } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FaUser, FaBriefcase } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { setSignupData } from '../../Slices/authSlice'
import { SendTheOtp } from '../../Services/operations/Auth'
import { OAuth } from '../../Services/Apis/UserApi'
import { startOAuth } from '../../utils/oauthProviders'
import CountryCode from '../../utils/CountryCode.json'

// the input style used across every form sir — shadow-sm gives the white/light-mode card a
// visible edge even where the border color alone reads faint, without relying on border
// contrast to do all the work
const inputClass = "w-full rounded-xl bg-richblack-800 border border-richblack-600 shadow-sm px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 focus:ring-2 focus:ring-yellow-50/20 transition-all duration-200"
const labelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
const errorClass = "mt-1 text-xs text-pink-200"
const sectionLabelClass = "text-xs font-bold uppercase tracking-wider text-richblack-300 mb-4"

// same list the backend's companySize enum accepts sir (Validation/schemas.js) and the same
// one already used on the post-hoc /For-Recruiters form (Home/ForRecruiters.jsx)
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

const Join = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const [accountType, setAccountType] = useState('User')
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector((state) => state.auth)

  // referral code sir — a friend's invite link is /Signup?ref=CODE. Read once here and carried
  // through the same untouched-spread pipe as accountType below; createUserSchema (backend)
  // silently ignores it if empty/unknown, so a plain /Signup visit is unaffected.
  const referralCode = searchParams.get('ref')

  // OAuth can't carry React state through the provider's full-page redirect sir, so the code
  // rides as its own ?ref= query param straight on the /auth/google | /auth/github URL — the
  // backend (services/oauth.js's login handler) reads it there and stashes it in a short-lived
  // cookie for the round trip. Without this an OAuth signup from a referral link silently drops
  // the referral (found live: this was the actual cause of the referral bonus never paying out
  // for anyone who used "Continue with Google/GitHub").
  const withRef = (url) => referralCode ? `${url}?ref=${encodeURIComponent(referralCode)}` : url

  const onSubmit = (data) => {
    // park the form data sir — the OTP screen finishes the creation with it. accountType and
    // (when Recruiter) the company fields ride along in `data` untouched — CreateTheUser
    // (Services/operations/Auth.js) just spreads signupData with no field allowlist, and the
    // backend's createUserSchema conditionally requires the company fields only when
    // accountType is 'Recruiter' (see Validation/schemas.js).
    dispatch(setSignupData({ ...data, accountType, ...(referralCode ? { referralCode } : {}) }))
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
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-8">

            {/* Account type sir — picking Recruiter grants role: 'Recruiter' immediately on
                signup, but the account stays LOCKED (every recruiter action blocked) until an
                Admin approves it — see Backend/Middlewares/Auth.js's isApprovedRecruiter */}
            <div>
              <p className={sectionLabelClass}>I want to</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('User')}
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    accountType === 'User'
                      ? 'border-yellow-50 bg-yellow-50/10 text-richblack-5 shadow-md'
                      : 'border-richblack-600 bg-richblack-800 text-richblack-300 hover:border-richblack-400'
                  }`}
                >
                  <FaUser className={`text-lg ${accountType === 'User' ? 'text-yellow-50' : 'text-richblack-400'}`} />
                  Find a job
                  <span className="text-xs font-normal text-richblack-400">Create as User</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('Recruiter')}
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    accountType === 'Recruiter'
                      ? 'border-yellow-50 bg-yellow-50/10 text-richblack-5 shadow-md'
                      : 'border-richblack-600 bg-richblack-800 text-richblack-300 hover:border-richblack-400'
                  }`}
                >
                  <FaBriefcase className={`text-lg ${accountType === 'Recruiter' ? 'text-yellow-50' : 'text-richblack-400'}`} />
                  Hire talent
                  <span className="text-xs font-normal text-richblack-400">Create as Recruiter</span>
                </button>
              </div>
              {accountType === 'Recruiter' && (
                <p className="mt-3 text-xs text-yellow-25 bg-yellow-50/10 border border-yellow-50/30 rounded-lg px-3 py-2">
                  Your account is created right away, but stays locked until an admin reviews your company details.
                </p>
              )}
            </div>

            {/* OAuth sir — User accounts only. A Recruiter always fills the company fields
                below manually, so the OAuth shortcut (which skips straight to a token, no
                company details) is deliberately hidden for that path. */}
            {accountType === 'User' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-richblack-700" />
                  <span className="text-xs text-richblack-400">or continue with</span>
                  <div className="flex-1 h-px bg-richblack-700" />
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => startOAuth('google', withRef(OAuth.google))}
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
                    onClick={() => startOAuth('github', withRef(OAuth.github))}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-richblack-5 border border-richblack-600 rounded-full hover:bg-richblack-800 transition-all duration-200 cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/>
                    </svg>
                    Continue with GitHub
                  </button>
                </div>
              </div>
            )}

            {/* Your details sir */}
            <div>
              <p className={sectionLabelClass}>Your details</p>
              <div className="space-y-4">
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
              </div>
            </div>

            {/* Recruiter-only company fields sir — all required, mirrors the same field set/
                validation already built for the post-hoc /For-Recruiters form
                (Home/ForRecruiters.jsx) and the backend's createUserSchema refines. A visually
                distinct section (own header, accent-tinted card) rather than fields just tacked
                on at the end of the same flat list as everything above. */}
            {accountType === 'Recruiter' && (
              <div>
                <p className={sectionLabelClass}>Company details</p>
                <div className="space-y-4 rounded-2xl border border-yellow-50/30 bg-yellow-50/5 p-5">
                  <div>
                    <label className={labelClass}>Company name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      className={inputClass}
                      {...register("companyName", { required: "Company name is required" })}
                    />
                    {errors.companyName && <p className={errorClass}>{errors.companyName.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Company website</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      className={inputClass}
                      {...register("companyWebsite", {
                        required: "Company website is required",
                        pattern: { value: /^https?:\/\/.+\..+/i, message: "Enter a valid website URL (e.g. https://example.com)" }
                      })}
                    />
                    {errors.companyWebsite && <p className={errorClass}>{errors.companyWebsite.message}</p>}
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className={labelClass}>Company size</label>
                      <select
                        defaultValue=""
                        className={`${inputClass} cursor-pointer appearance-none`}
                        {...register("companySize", { required: "Please select your company size" })}
                      >
                        <option value="" disabled className="bg-richblack-800 text-richblack-5">Select size</option>
                        {COMPANY_SIZES.map((size) => (
                          <option key={size} value={size} className="bg-richblack-800 text-richblack-5">{size} employees</option>
                        ))}
                      </select>
                      {errors.companySize && <p className={errorClass}>{errors.companySize.message}</p>}
                    </div>
                    <div className="w-1/2">
                      <label className={labelClass}>Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru, India"
                        className={inputClass}
                        {...register("location", { required: "Location is required" })}
                      />
                      {errors.location && <p className={errorClass}>{errors.location.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Hiring needs</label>
                    <textarea
                      rows={3}
                      placeholder="What roles are you hiring for?"
                      className={`${inputClass} resize-none`}
                      {...register("hiringNeeds", { required: "Please tell us your hiring needs" })}
                    />
                    {errors.hiringNeeds && <p className={errorClass}>{errors.hiringNeeds.message}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <IconBtn
                type="submit"
                text={loading ? "Sending OTP..." : "Get OTP"}
                disabled={loading}
                customClasses="w-full justify-center"
              />

              <p className="text-center text-sm text-richblack-300">
                Already have an account?{' '}
                <Link to="/Login" className="text-yellow-50 font-semibold hover:underline">Log in</Link>
              </p>
            </div>
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
