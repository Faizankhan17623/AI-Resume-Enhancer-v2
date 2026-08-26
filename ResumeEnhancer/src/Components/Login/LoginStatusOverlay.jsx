import { motion, AnimatePresence } from 'motion/react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// centered full-screen login status sir — replaces the old toast.loading/success/error trio for
// both the password form (Login/User.jsx) and the OAuth landing page (OAuthComplete.jsx), so both
// paths show the exact same "spinner -> check/cross -> message" sequence instead of a toast.
//
// `status` is one of 'loading' | 'success' | 'error' | null (null renders nothing sir — the
// caller only mounts this while an attempt is in flight or was just resolved).
const LoginStatusOverlay = ({ status, message }) => (
  <AnimatePresence>
    {status && (
      <motion.div
        initial="hidden"
        animate="show"
        exit="exit"
        variants={modalBackdrop}
        className="fixed inset-0 z-[100] bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4"
      >
        <motion.div
          variants={modalPanel}
          className="w-full max-w-xs rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl p-8 flex flex-col items-center gap-4 text-center"
        >
          {status === 'loading' && (
            <>
              {/* a plain spinning ring sir — no extra icon library needed for this one shape */}
              <div className="w-12 h-12 rounded-full border-4 border-richblack-600 border-t-yellow-50 animate-spin" />
              <p className="text-sm font-medium text-richblack-5">{message || 'Logging in...'}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-12 h-12 rounded-full bg-caribgreen-700/30 border-2 border-caribgreen-700 flex items-center justify-center"
              >
                <FaCheck className="text-caribgreen-25 text-lg" />
              </motion.div>
              <p className="text-sm font-medium text-richblack-5">{message || 'Login successful'}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-12 h-12 rounded-full bg-pink-700/30 border-2 border-pink-700 flex items-center justify-center"
              >
                <FaTimes className="text-pink-100 text-lg" />
              </motion.div>
              <p className="text-sm font-medium text-richblack-5">{message || 'Login failed'}</p>
            </>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default LoginStatusOverlay
