import { useState } from 'react'
import OtpInput from 'react-otp-input'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FiMail } from 'react-icons/fi'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { CreateTheUser, SendTheOtp } from '../../Services/operations/Auth'

const OTP = () => {
  const [otp, setOtp] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { signupData, loading } = useSelector((state) => state.auth)

  // nobody lands here without filling the signup form first sir
  if (!signupData) {
    return <Navigate to="/Signup" />
  }

  const handleVerify = (e) => {
    e.preventDefault()
    dispatch(CreateTheUser(signupData, otp, navigate))
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

        {/* OTP boxes sir */}
        <form onSubmit={handleVerify} className="mt-10 w-full flex flex-col items-center">
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
            text={loading ? "Verifying..." : "Verify & Create Account"}
            disabled={loading || otp.length !== 6}
            customClasses="w-full justify-center mt-8"
          />
        </form>

        <button
          onClick={() => dispatch(SendTheOtp(signupData.email))}
          disabled={loading}
          className="mt-6 text-sm text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer disabled:opacity-50"
        >
          Didn't get it? Resend the OTP
        </button>
      </PageTransition>
    </div>
  )
}

export default OTP
