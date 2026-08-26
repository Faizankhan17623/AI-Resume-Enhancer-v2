import { useCallback, useRef, useState } from 'react'

// a boolean that's guaranteed to stay true for at least `minMs` once triggered sir, even if the
// underlying fetch resolves almost instantly — used across the Admin tab/filter switches (Users'
// role dropdown, Testimonials/Reports/RecruiterApplications' status tabs) so a real loading state
// is visibly shown instead of the old list silently swapping to the new one with no feedback at
// all (found live: {loading && list.length === 0} never re-triggers on a filter change, since the
// PREVIOUS filter's list is still non-empty while the new one loads).
//
// Usage: const [switching, trigger] = useMinDurationFlag(4000); onClick={() => { trigger(); doFetch() }}
export const useMinDurationFlag = (minMs = 4000) => {
  const [active, setActive] = useState(false)
  const timerRef = useRef(null)

  const trigger = useCallback(() => {
    clearTimeout(timerRef.current)
    setActive(true)
    timerRef.current = setTimeout(() => setActive(false), minMs)
  }, [minMs])

  return [active, trigger]
}
