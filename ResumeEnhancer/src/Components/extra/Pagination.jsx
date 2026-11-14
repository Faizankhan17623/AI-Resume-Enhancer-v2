// Shared numbered pagination sir, per direct request (Black Dashboard-style circular page
// numbers) — replaces the plain "Previous / page of N / Next" control that was copy-pasted
// identically across JobBoard.jsx, Admin/Users.jsx, Admin/Payments.jsx, Admin/Audit.jsx, and
// Admin/CreditGrants.jsx. One component, wired into all five instead of five separate markups.
//
// Windowing: for more than 7 pages, shows first, last, current ± 1, and "…" gaps — so a 500-page
// table never renders 500 buttons. Below that threshold every page number shows.
const buildPageList = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, current])
  if (current > 1) pages.add(current - 1)
  if (current < total) pages.add(current + 1)
  if (current <= 3) { pages.add(2); pages.add(3) }
  if (current >= total - 2) { pages.add(total - 1); pages.add(total - 2) }

  const sorted = [...pages].sort((a, b) => a - b)
  const withGaps = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withGaps.push('gap')
    withGaps.push(p)
  })
  return withGaps
}

/**
 * @param {number} page current page, 1-indexed
 * @param {number} totalPages
 * @param {(next: number) => void} onPageChange
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null

  const pageList = buildPageList(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        className="w-9 h-9 flex items-center justify-center rounded-full text-richblack-300 hover:bg-richblack-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors duration-200 cursor-pointer"
      >
        «
      </button>
      {pageList.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-richblack-500">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200 cursor-pointer ${
              p === page
                ? 'bg-yellow-50 text-richblack-900'
                : 'text-richblack-300 hover:bg-richblack-700'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        className="w-9 h-9 flex items-center justify-center rounded-full text-richblack-300 hover:bg-richblack-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors duration-200 cursor-pointer"
      >
        »
      </button>
    </div>
  )
}

export default Pagination
