import { useState, useEffect, useRef } from 'react'
import OtpInput from 'react-otp-input'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { FiMail, FiClock } from 'react-icons/fi'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import LoginStatusOverlay from '../Login/LoginStatusOverlay'
import { CreateTheUser, SendTheOtp } from '../../Services/operations/Auth'

// matches the backend's real OTP TTL sir (Backend/Models/OTP.js: `expires: 60 * 2`, a MongoDB
// TTL index) — showing any other number here would just be lying to the user about when their
// code actually stops working
const OTP_LIFETIME_SECONDS = 2 * 60

const formatCountdown = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const OTP = () => {
  const [otp, setOtp] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(OTP_LIFETIME_SECONDS)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { signupData, loading } = useSelector((state) => state.auth)

  // drives LoginStatusOverlay sir — same pattern as Login/User.jsx and Join.jsx, replacing the
  // old toast.loading/success/error trio with one centered status panel
  const [otpStatus, setOtpStatus] = useState({ status: null, message: '' })

  // counts down once a second sir, independent of anything else on the page — resets to the
  // full 2 minutes below whenever a fresh OTP is actually sent (initial send from Join.jsx, or
  // this page's own Resend button), since that's the only moment a NEW code starts its own TTL
  const intervalRef = useRef(null)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const expired = secondsLeft === 0

  // nobody lands here without filling the signup form first sir
  if (!signupData) {
    return <Navigate to="/Signup" />
  }

  const handleVerify = (e) => {
    e.preventDefault()
    dispatch(CreateTheUser(signupData, otp, navigate, (status, message) => {
      setOtpStatus({ status, message })
      // an error (wrong/expired code) clears itself sir so the user can see their code boxes
      // and try again, or hit Resend once the timer runs out — success navigates away on its
      // own via CreateTheUser's built-in redirect, no need to clear that case here
      if (status === 'error') {
        setTimeout(() => setOtpStatus({ status: null, message: '' }), 2200)
      }
    }))
  }

  const handleResend = () => {
    setOtp('')
    dispatch(SendTheOtp(signupData.email, null, (status, message) => {
      setOtpStatus({ status, message })
      if (status === 'success') {
        // a fresh code just started its own 2-minute window sir
        setSecondsLeft(OTP_LIFETIME_SECONDS)
      }
      if (status === 'error' || status === 'success') {
        setTimeout(() => setOtpStatus({ status: null, message: '' }), 2200)
      }
    }))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Verify OTP | Resumify</title>
      </Helmet>
      <Navbar />

      <PageTransition className="w-full max-w-md mx-auto px-6 py-20 flex flex-col items-center">

        <div className="w-16 h-16 rounded-full bg-richblack-800 border border-richblack-700 flex items-center justify-center mb-6">
          <FiMail className="text-3xl text-yellow-50" />
        </div>

        <h1 className="font-display text-3xl text-richblack-5 tracking-tight text-center">
          Check your <span className="italic text-warm-200">email</span>
        </h1>
        <p className="mt-3 text-richblack-200 text-sm text-center">
          We sent a 6-digit code to <span className="text-blue-50 font-medium">{signupData.email}</span>
        </p>

        {/* countdown sir — turns pink once the code has actually expired, matching the
            backend's TTL exactly (see OTP_LIFETIME_SECONDS above) */}
        <div className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${expired ? 'text-pink-200' : 'text-richblack-300'}`}>
          <FiClock className="text-sm" />
          {expired ? 'Code expired — request a new one' : `Code expires in ${formatCountdown(secondsLeft)}`}
        </div>

        {/* OTP boxes sir */}
        <form onSubmit={handleVerify} className="mt-8 w-full flex flex-col items-center">
          <OtpInput
            value={otp}
            onChange={setOtp}
            numInputs={6}
            renderInput={(props) => (
              <input
                {...props}
                placeholder="•"
                style={{ width: '48px' }}
                className="h-14 mx-1.5 rounded-xl bg-richblack-800 border border-richblack-600 text-richblack-5 text-xl font-bold text-center focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            )}
          />

          <IconBtn
            type="submit"
            text="Verify & Create Account"
            disabled={loading || otp.length !== 6 || expired}
            customClasses="w-full justify-center mt-8"
          />
        </form>

        <button
          onClick={handleResend}
          disabled={loading}
          className={`mt-6 text-sm transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
            expired ? 'text-yellow-50 font-semibold hover:underline' : 'text-richblack-300 hover:text-yellow-50'
          }`}
        >
          {expired ? 'Request a new OTP' : "Didn't get it? Resend the OTP"}
        </button>
      </PageTransition>

      <LoginStatusOverlay status={otpStatus.status} message={otpStatus.message} />
    </div>
  )
}

export default OTP
