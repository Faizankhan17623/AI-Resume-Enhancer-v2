// h-full sir, not a fixed min-height — a fixed 300px box only centers the spinner within
// that box, which reads as "stuck near the top" on a full-height page like NewReview's. h-full
// makes this fill whatever scrollable content area it's placed in (see PageTransition's
// h-full wrapper), so justify-center/items-center actually center it in the visible page.
//
// min-h-[60vh] sir (via MIN_HEIGHT.page below), not the old flat min-h-[300px] — most full-page
// callers drop this straight into a plain PageTransition block (no explicit height of its own),
// where h-full collapses to whatever the min-height floor is. 300px meant the spinner sat in a
// short band right under the page's filters/header instead of reading as centered in the
// section — found live across every Admin page (Testimonials, Reports, Settings,
// RecruiterApplications, ...) once each was actually checked. 60vh approximates "the middle of
// the visible content area below the navbar" without needing each page to hand-compute
// navbar+AdminNav height.
//
// `size="compact"` sir opts back into a short, fixed box — for a caller inside something
// height-constrained (a modal panel with its own max-h, a card, a drawer) where 60vh would
// balloon the container itself just to show a spinner (found live: ReferralDashboardModal's
// max-h-[85vh] panel would nearly hit that cap on load with the page default).
const MIN_HEIGHT = { page: 'min-h-[60vh]', compact: 'min-h-[160px]' }

const Loading = ({ text = "Loading...", size = "page" }) => {
  return (
    <div className={`w-full h-full ${MIN_HEIGHT[size]} flex flex-col justify-center items-center gap-4`}>
      <div className="w-16 h-16 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-yellow-50 font-semibold text-lg">{text}</p>
    </div>
  )
}

export default Loading
