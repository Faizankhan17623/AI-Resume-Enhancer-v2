import { useCallback, useRef, useState } from 'react'

// wraps a real in-flight boolean (true while a request is actually pending) so the visible
// loading state never flashes shorter than `minMs` sir — a fast API response (Announcements
// publish/Settings toggle both usually resolve in well under a second) would otherwise flip the
// loader on and off so quickly it reads as "no loader at all", which is what
// CreateAnnouncement/UpdateAnnouncement/UpdateSetting's onLoadingChange(true)/onLoadingChange(false)
// pair was doing before this.
//
// Usage: const [visible, setLoading] = useMinDurationLoading(600); dispatch(Thing(..., setLoading))
// setLoading(true) shows immediately; setLoading(false) is delayed until minMs has elapsed since
// the true call, so the spinner always has a real, noticeable moment on screen.
export const useMinDurationLoading = (minMs = 600) => {
  const [visible, setVisible] = useState(false)
  const startedAtRef = useRef(0)
  const hideTimerRef = useRef(null)

  const setLoading = useCallback((next) => {
    if (next) {
      clearTimeout(hideTimerRef.current)
      startedAtRef.current = Date.now()
      setVisible(true)
      return
    }

    const elapsed = Date.now() - startedAtRef.current
    const remaining = Math.max(0, minMs - elapsed)
    hideTimerRef.current = setTimeout(() => setVisible(false), remaining)
  }, [minMs])

  return [visible, setLoading]
}
