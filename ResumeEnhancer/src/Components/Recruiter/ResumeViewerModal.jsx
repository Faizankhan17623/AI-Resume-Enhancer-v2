import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FaTimes, FaChevronLeft, FaChevronRight, FaBolt, FaExternalLinkAlt } from 'react-icons/fa'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// same fit-tier label/color convention as JobApplicantsList.jsx's own fitTierMeta sir — kept in
// sync manually, same as JobAnalytics.jsx's copy (no shared file for it yet)
const fitTierMeta = {
  best_fit: { label: 'Best fit', className: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700' },
  hireable: { label: 'Hireable', className: 'bg-warm-200/20 text-warm-25 border-warm-200' },
  can_get_it_done: { label: 'Can get it done', className: 'bg-warm-700/30 text-warm-25 border-warm-600' },
  not_a_fit: { label: 'Not a fit', className: 'bg-richblack-700 text-richblack-300 border-richblack-600' },
}

// per direct request sir — "a recruiter reviewing 50 applicants shouldn't have to open one PDF
// link at a time in a fresh tab". `applicants` is the SAME ranked (fit-score-first) array
// JobApplicantsList.jsx already renders, so cycling through here matches the order the recruiter
// sees on the page behind it. Only applicants with a resumeUrl are included — nothing to view
// for a deleted-resume or old-shape application otherwise.
const ResumeViewerModal = ({ applicants, startIndex, onClose }) => {
  const withResume = applicants.filter((a) => a.resumeUrl)
  const startAt = Math.max(0, withResume.findIndex((a) => a._id === applicants[startIndex]?._id))
  const [index, setIndex] = useState(startAt === -1 ? 0 : startAt)

  if (withResume.length === 0) return null

  const current = withResume[index]
  const fitMeta = current.fitTier ? fitTierMeta[current.fitTier] : null

  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => setIndex((i) => Math.min(withResume.length - 1, i + 1))

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
        className="fixed inset-0 z-[100] bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center px-4 py-8"
        onClick={onClose}
      >
        <motion.div
          variants={modalPanel}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl h-[85vh] rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-richblack-700 shrink-0">
            <div className="min-w-0">
              <h2 className="font-display text-lg text-richblack-5 truncate">
                {current.candidate ? `${current.candidate.firstName} ${current.candidate.lastName}` : 'Deleted candidate'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-richblack-400">{index + 1} of {withResume.length}</p>
                {fitMeta && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${fitMeta.className}`}>
                    <FaBolt className="text-[9px]" /> {fitMeta.label} ({current.fitScore})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={current.resumeUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in a new tab"
                className="text-richblack-300 hover:text-richblack-5 cursor-pointer"
              >
                <FaExternalLinkAlt />
              </a>
              <button onClick={onClose} className="text-richblack-300 hover:text-richblack-5 cursor-pointer">
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-richblack-900">
            {/* browsers render a PDF natively in an iframe sir — no viewer library needed, same
                approach every "open this PDF" link elsewhere in this app already relies on
                (just via a new tab instead of embedded) */}
            <iframe
              key={current._id}
              src={current.resumeUrl}
              title={`${current.candidate?.firstName || 'Candidate'}'s resume`}
              className="w-full h-full border-0"
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-richblack-700 shrink-0">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FaChevronLeft className="text-xs" /> Previous
            </button>
            <button
              onClick={goNext}
              disabled={index === withResume.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <FaChevronRight className="text-xs" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ResumeViewerModal
