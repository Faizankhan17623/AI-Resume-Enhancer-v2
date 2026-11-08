// shared fit-tier label/color map sir, per 2026-11-09 audit — was duplicated verbatim across
// JobApplicantsList.jsx, JobAnalytics.jsx, and ResumeViewerModal.jsx, each with its own comment
// acknowledging the duplication. A worst-to-best gradient across colors already in this app's
// palette (no purple token exists here) — richblack (neutral/low) through warm (mid) to
// caribgreen (best), reading as its own distinct signal from the status badges elsewhere rather
// than reusing blue/pink for a different meaning.
export const fitTierMeta = {
  not_a_fit: { label: 'Not a fit', className: 'bg-richblack-700 text-richblack-300 border-richblack-600' },
  can_get_it_done: { label: 'Can get it done', className: 'bg-warm-700/30 text-warm-25 border-warm-600' },
  hireable: { label: 'Hireable', className: 'bg-warm-200/20 text-warm-25 border-warm-200' },
  best_fit: { label: 'Best fit', className: 'bg-caribgreen-700/30 text-caribgreen-100 border-caribgreen-700' },
}
