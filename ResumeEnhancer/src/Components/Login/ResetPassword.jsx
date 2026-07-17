import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import IconBtn from '../extra/IconBtn'
import PasswordInput from '../extra/PasswordInput'
import PageTransition from '../extra/PageTransition'
import { ResetPassword as SubmitResetPassword } from '../../Services/operations/Auth'

const inputClass = "w-full rounded-xl bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
const labelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
const errorClass = "mt-1 text-xs text-pink-200"

const ResetPassword = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useParams()
  const { loading } = useSelector((state) => state.auth)

  const onSubmit = (data) => {
    dispatch(SubmitResetPassword(token, data.newPassword, data.confirmNewPassword, navigate))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Reset password | Resumify</title>
      </Helmet>
      <Navbar />

      <PageTransition className="w-full max-w-md mx-auto px-6 py-16">

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-richblack-5 tracking-tight">
            Reset <span className="italic text-warm-200">password</span>
          </h1>
          <p className="mt-2 text-richblack-200 text-base">
            Choose a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <div>
            <label className={labelClass}>New Password</label>
            <PasswordInput
              inputClass={inputClass}
              register={register}
              name="newPassword"
              validation={{
                required: "New password is required",
                minLength: { value: 8, message: "Minimum 8 characters" }
              }}
            />
            {errors.newPassword && <p className={errorClass}>{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Confirm New Password</label>
            <PasswordInput
              inputClass={inputClass}
              register={register}
              name="confirmNewPassword"
              validation={{
                required: "Please confirm the new password",
                validate: (value) => value === watch("newPassword") || "Passwords do not match"
              }}
            />
            {errors.confirmNewPassword && <p className={errorClass}>{errors.confirmNewPassword.message}</p>}
          </div>

          <IconBtn
            type="submit"
            text={loading ? "Resetting..." : "Reset password"}
            disabled={loading}
            customClasses="w-full justify-center"
          />

          <p className="text-center text-sm text-richblack-300">
            Remembered your password?{' '}
            <Link to="/Login" className="text-yellow-50 font-semibold hover:underline">Log in</Link>
          </p>
        </form>
      </PageTransition>
    </div>
  )
}

export default ResetPassword
