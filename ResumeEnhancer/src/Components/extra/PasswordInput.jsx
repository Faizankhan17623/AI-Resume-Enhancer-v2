import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

// shared password field sir — shows/hides the value with the eye icon, used on every password form
const PasswordInput = ({ inputClass, register, name, validation, placeholder = "••••••••", registerProps }) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className={`${inputClass} pr-11`}
        {...(registerProps || register(name, validation))}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
        tabIndex={-1}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  )
}

export default PasswordInput
