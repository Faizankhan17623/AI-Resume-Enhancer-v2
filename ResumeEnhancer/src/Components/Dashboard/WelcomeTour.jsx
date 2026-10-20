import { useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { FaArrowRight, FaArrowLeft, FaTimes, FaFileUpload, FaMagic, FaRocket } from 'react-icons/fa'
import { TransitionPanel } from '../Animated/TransitionPanel'

const SEEN_KEY = 'resumifyWelcomeTourSeen'

// localStorage can throw (private windows, blocked storage) sir — the tour just shows again then
const readSeen = () => {
  try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
const writeSeen = () => {
  try { localStorage.setItem(SEEN_KEY, '1') } catch { /* nothing to do */ }
}

const STEPS = [
  {
    icon: <FaFileUpload />,
    title: 'Get your ATS score',
    body: 'Upload your resume and paste a job description. Resumify scores it the way a real applicant tracking system would, in seconds.',
  },
  {
    icon: <FaMagic />,
    title: 'Fix it line by line',
    body: 'See the keywords you are missing and get before/after rewrites for every weak bullet, then rescore to watch the number climb.',
  },
  {
    icon: <FaRocket />,
    title: 'Go beyond the resume',
    body: 'Generate cover letters and outreach emails, track every application on a board, and diagnose why a rejection happened.',
  },
]

const panelVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

// first-visit walkthrough sir — shown once to a user who hasn't finished onboarding. Closing it
// (skip, X, or the final button) never shows it again on this browser; the "Get started" checklist
// on the dashboard stays as the persistent version of the same nudge.
const WelcomeTour = ({ enabled }) => {
  const [dismissed, setDismissed] = useState(readSeen)
  const [index, setIndex] = useState(0)

  const open = enabled && !dismissed
  const isLast = index === STEPS.length - 1

  const close = () => {
    writeSeen()
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-richblack-900/75 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Resumify"
            className="relative w-full max-w-md rounded-2xl bg-richblack-800 border border-richblack-600 p-8 shadow-2xl"
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 text-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer p-1"
              title="Skip tour"
            >
              <FaTimes />
            </button>

            <TransitionPanel
              activeIndex={index}
              variants={panelVariants}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {STEPS.map((step) => (
                <div key={step.title} className="pt-2">
                  <div className="w-12 h-12 rounded-full bg-warm-25 text-richblack-900 flex items-center justify-center text-lg mb-5">
                    {step.icon}
                  </div>
                  <h2 className="font-display text-2xl text-richblack-5 mb-2">{step.title}</h2>
                  <p className="text-sm text-richblack-300 leading-relaxed min-h-[84px]">{step.body}</p>
                </div>
              ))}
            </TransitionPanel>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-yellow-50' : 'w-1.5 bg-richblack-600'}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {index > 0 && (
                  <button
                    onClick={() => setIndex((i) => i - 1)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
                  >
                    <FaArrowLeft className="text-[10px]" /> Back
                  </button>
                )}
                {isLast ? (
                  <Link
                    to="/Dashboard/New-Review"
                    onClick={close}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:bg-yellow-25 transition-colors duration-200"
                  >
                    Start my first review <FaArrowRight className="text-xs" />
                  </Link>
                ) : (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:bg-yellow-25 transition-colors duration-200 cursor-pointer"
                  >
                    Next <FaArrowRight className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default WelcomeTour
