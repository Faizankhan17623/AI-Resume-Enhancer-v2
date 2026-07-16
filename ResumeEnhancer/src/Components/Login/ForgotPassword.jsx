import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import { ForgotPassword as SendForgotPassword } from '../../Services/operations/Auth'

const inputClass = "w-full rounded-xl bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
const errorClass = "mt-1 text-xs text-pink-200"

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.auth)
  const [emailSent, setEmailSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const onSubmit = (data) => {
    setSentEmail(data.email)
    dispatch(SendForgotPassword(data.email, setEmailSent))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Forgot password | Resumify</title>
      </Helmet>
      <Navbar />

      <div className="w-full max-w-md mx-auto px-6 py-16 animate-fadeIn">

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-richblack-5 tracking-tight">
            Forgot <span className="italic text-warm-200">password</span>
          </h1>
          <p className="mt-2 text-richblack-200 text-base">
            {emailSent
              ? "We've emailed you a link to reset your password"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {emailSent ? (
          <div className="text-center">
            <IconBtn
              onclick={() => dispatch(SendForgotPassword(sentEmail, setEmailSent))}
              text="Resend the email"
              outline
              customClasses="mx-auto"
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

            <IconBtn
              type="submit"
              text={loading ? "Sending..." : "Send reset link"}
              disabled={loading}
              customClasses="w-full justify-center"
            />
          </form>
        )}

        <p className="text-center text-sm text-richblack-300 mt-6">
          Remembered your password?{' '}
          <Link to="/Login" className="text-yellow-50 font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
