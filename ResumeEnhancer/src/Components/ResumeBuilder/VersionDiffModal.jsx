import { motion, AnimatePresence } from 'motion/react'
import { FaTimes, FaUndo } from 'react-icons/fa'
import { modalBackdrop, modalPanel } from '../../utils/motion'
import { diffResumeVersions } from '../../utils/resumeDiff'

// renders a word-diff token stream sir — 'same' plain, 'removed' struck-through red,
// 'added' underlined green. Shared by the title/summary/bullet renderers below.
const WordDiff = ({ tokens }) => (
  <span>
    {tokens.map((t, i) => {
      if (t.type === 'removed') return <span key={i} className="bg-pink-700/25 text-pink-100 line-through decoration-pink-200">{t.value}</span>
      if (t.type === 'added') return <span key={i} className="bg-caribgreen-700/25 text-caribgreen-25 underline decoration-caribgreen-100">{t.value}</span>
      return <span key={i}>{t.value}</span>
    })}
  </span>
)

// one field-level diff row sir — a label plus its content, styling itself by whether
// anything actually changed (unchanged fields render plain, muted, no diff markup)
const FieldDiff = ({ label, tokens }) => {
  if (!tokens) return null
  const changed = tokens.some((t) => t.type !== 'same')
  return (
    <div>
      <p className="text-xs font-semibold text-richblack-400 mb-1">{label}</p>
      <p className={`text-sm leading-relaxed ${changed ? 'text-richblack-5' : 'text-richblack-300'}`}>
        <WordDiff tokens={tokens} />
      </p>
    </div>
  )
}

// one list-entry diff row sir (skills, experience bullets, education, projects, certifications)
// — same/added/removed/changed, each styled distinctly so the reader can scan the shape of the
// change without reading every word
const ListEntryDiff = ({ entry, renderValue }) => {
  if (entry.type === 'same') {
    return <div className="text-sm text-richblack-300 py-1.5">{renderValue(entry.value)}</div>
  }
  if (entry.type === 'removed') {
    return <div className="text-sm py-1.5 bg-pink-700/10 rounded-lg px-2 text-pink-100 line-through decoration-pink-200">{renderValue(entry.value)}</div>
  }
  if (entry.type === 'added') {
    return <div className="text-sm py-1.5 bg-caribgreen-700/10 rounded-lg px-2 text-caribgreen-25 underline decoration-caribgreen-100">{renderValue(entry.value)}</div>
  }
  // changed sir — show the new value's shape with a word-diff on the text that actually moved
  return (
    <div className="text-sm py-1.5 bg-yellow-700/10 rounded-lg px-2 text-richblack-5">
      {renderValue(entry.newValue)}
      <div className="mt-1 text-xs text-richblack-300"><WordDiff tokens={entry.words} /></div>
    </div>
  )
}

const renderExperience = (e) => `${e?.role || 'Role'} at ${e?.company || 'Company'}`
const renderEducation = (e) => `${e?.degree || 'Degree'} — ${e?.school || 'School'}`
const renderProject = (p) => p?.name || 'Untitled project'
const renderCertification = (c) => `${c?.name || 'Certification'}${c?.issuer ? ` — ${c.issuer}` : ''}`
const renderSkill = (s) => s

// compares a saved version against the CURRENT in-editor state sir — "current" here is the
// live editor state (current.title/summary/etc from builtResumeSlice), not necessarily what's
// saved server-side yet, so the diff always reflects exactly what the user is looking at
const VersionDiffModal = ({ open, onClose, version, current, onRestore, restoring }) => {
  if (!open) return null

  const diff = version ? diffResumeVersions(version, current) : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalBackdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[60] bg-richblack-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-richblack-800 border border-richblack-600 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg text-richblack-5">Compare with current</h3>
              <button onClick={onClose} className="p-1.5 text-richblack-300 hover:text-richblack-5 rounded-full hover:bg-richblack-700 transition-colors cursor-pointer">
                <FaTimes />
              </button>
            </div>
            <p className="text-xs text-richblack-400 mb-5">
              {version && `Saved ${new Date(version.savedAt).toLocaleString()}`} — struck-through text was removed, underlined text is new.
            </p>

            {!diff?.hasAnyChange ? (
              <p className="text-sm text-richblack-300 py-8 text-center">No differences — this version matches what you have open right now.</p>
            ) : (
              <div className="space-y-5">
                <FieldDiff label="Title" tokens={diff.title} />
                <FieldDiff label="Summary" tokens={diff.summary} />

                {diff.skills?.some((e) => e.type !== 'same') && (
                  <div>
                    <p className="text-xs font-semibold text-richblack-400 mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diff.skills.map((entry, i) => (
                        <span key={i} className={`px-2 py-1 rounded-full text-xs ${
                          entry.type === 'removed' ? 'bg-pink-700/20 text-pink-100 line-through'
                          : entry.type === 'added' ? 'bg-caribgreen-700/20 text-caribgreen-25 underline'
                          : 'bg-richblack-700 text-richblack-300'
                        }`}>
                          {renderSkill(entry.value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {diff.experience?.some((e) => e.type !== 'same') && (
                  <div>
                    <p className="text-xs font-semibold text-richblack-400 mb-1">Experience</p>
                    {diff.experience.map((entry, i) => <ListEntryDiff key={i} entry={entry} renderValue={renderExperience} />)}
                  </div>
                )}

                {diff.education?.some((e) => e.type !== 'same') && (
                  <div>
                    <p className="text-xs font-semibold text-richblack-400 mb-1">Education</p>
                    {diff.education.map((entry, i) => <ListEntryDiff key={i} entry={entry} renderValue={renderEducation} />)}
                  </div>
                )}

                {diff.projects?.some((e) => e.type !== 'same') && (
                  <div>
                    <p className="text-xs font-semibold text-richblack-400 mb-1">Projects</p>
                    {diff.projects.map((entry, i) => <ListEntryDiff key={i} entry={entry} renderValue={renderProject} />)}
                  </div>
                )}

                {diff.certifications?.some((e) => e.type !== 'same') && (
                  <div>
                    <p className="text-xs font-semibold text-richblack-400 mb-1">Certifications</p>
                    {diff.certifications.map((entry, i) => <ListEntryDiff key={i} entry={entry} renderValue={renderCertification} />)}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-richblack-700">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 transition-colors cursor-pointer">
                Close
              </button>
              <button
                onClick={onRestore}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-yellow-50 border border-richblack-600 rounded-full hover:bg-richblack-700 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <FaUndo className="text-xs" /> {restoring ? 'Restoring...' : 'Restore this version'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default VersionDiffModal
