import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaEnvelopeOpenText } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
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

      <PageTransition className="w-full max-w-md mx-auto px-6 py-16">

        <AnimatePresence mode="wait">
          {emailSent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'backOut', delay: 0.1 }}
                className="mx-auto w-16 h-16 rounded-full bg-caribgreen-900/15 flex items-center justify-center mb-6"
              >
                <FaEnvelopeOpenText className="text-2xl text-caribgreen-100" />
              </motion.div>
              <h1 className="font-display text-3xl text-richblack-5 tracking-tight">
                Check your <span className="italic text-warm-200">email</span>
              </h1>
              <p className="mt-3 text-richblack-200 text-base leading-relaxed">
                We've sent a password reset link to<br />
                <span className="text-richblack-5 font-medium">{sentEmail}</span>
              </p>
              <p className="mt-6 text-sm text-richblack-400">
                Didn't get it?{' '}
                <button
                  type="button"
                  onClick={() => dispatch(SendForgotPassword(sentEmail, setEmailSent))}
                  disabled={loading}
                  className="text-yellow-50 font-semibold hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Resending..." : "Resend the email"}
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-10">
                <h1 className="font-display text-4xl text-richblack-5 tracking-tight">
                  Forgot <span className="italic text-warm-200">password</span>
                </h1>
                <p className="mt-2 text-richblack-200 text-base">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

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
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-richblack-300 mt-6">
          Remembered your password?{' '}
          <Link to="/Login" className="text-yellow-50 font-semibold hover:underline">Log in</Link>
        </p>
      </PageTransition>
    </div>
  )
}

export default ForgotPassword
