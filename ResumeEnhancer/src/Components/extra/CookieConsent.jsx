import { useState, useEffect } from 'react'
import { FaCookieBite } from 'react-icons/fa'

// the cookie consent card sir — shows once at the bottom until the visitor accepts,
// then the choice lives in localStorage so we never nag them again
const CONSENT_KEY = 'cookieConsent'

const CookieConsent = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50">
      <div className="bg-richblack-800 border border-richblack-700 rounded-xl shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <FaCookieBite className="text-yellow-50 text-xl shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-richblack-5">We use cookies</p>
            <p className="text-xs text-richblack-200 mt-1 leading-relaxed">
              Resumify uses essential cookies to keep you signed in and to process
              payments securely. By continuing, you agree to their use.
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleAccept}
            className="bg-yellow-50 text-richblack-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors duration-200 cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
